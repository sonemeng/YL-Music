<?php
// 禁用执行时间限制，支持大文件传输
set_time_limit(0);
ini_set('memory_limit', '64M'); // 降低内存使用

// 设置CORS头部，允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Range');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 获取目标URL
$targetUrl = $_GET['url'] ?? '';

if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode(['error' => '缺少URL参数']);
    exit();
}

// 基础安全校验：仅允许 http/https，并且必须有 host
$parsedUrl = parse_url($targetUrl);
$scheme = $parsedUrl['scheme'] ?? '';
$domain = $parsedUrl['host'] ?? '';
if (!in_array(strtolower($scheme), ['http','https'], true) || empty($domain)) {
    http_response_code(400);
    echo json_encode(['error' => '仅支持 http/https 且必须包含有效主机']);
    exit();
}

// 初始化cURL
$ch = curl_init();

// 设置输出缓冲
ob_end_clean();

// 设置cURL选项 - 流式传输
curl_setopt_array($ch, [
    CURLOPT_URL => $targetUrl,
    CURLOPT_RETURNTRANSFER => false, // 流式输出
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 0, // 无超时限制
    CURLOPT_CONNECTTIMEOUT => 15, // 连接超时15秒
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_BUFFERSIZE => 4096, // 4KB缓冲区，更小更快
    CURLOPT_WRITEFUNCTION => function($ch, $data) {
        echo $data;
        flush(); // 立即输出
        return strlen($data);
    },
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    CURLOPT_HTTPHEADER => [
        'Referer: https://www.kuwo.cn/',
        'Accept: */*',
        'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control: no-cache'
    ]
]);

// 先获取头部信息
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$contentLength = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);

// 设置响应状态码和头部
http_response_code($httpCode);

// 如果是音频文件，设置适当的Content-Type和头部
if (strpos($contentType, 'audio') !== false || strpos($targetUrl, '.mp3') !== false || strpos($targetUrl, '.flac') !== false) {
    header('Content-Type: ' . ($contentType ?: 'audio/mpeg'));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=3600');
    if ($contentLength > 0) {
        header('Content-Length: ' . $contentLength);
    }
} else {
    // 如果是JSON响应，设置JSON Content-Type
    header('Content-Type: application/json; charset=utf-8');
}

// 执行请求（流式输出已在WRITEFUNCTION中处理）
$result = curl_exec($ch);
$error = curl_error($ch);

curl_close($ch);

// 检查是否有错误
if ($error || $result === false) {
    http_response_code(500);
    echo json_encode(['error' => '代理请求失败: ' . $error]);
    exit();
}
?>