<?php
// includes/response.php

function json_success(array $data = []) {
    header('Content-Type: application/json');
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}

function json_error(string $message, int $httpStatus = 400, array $data = []) {
    http_response_code($httpStatus);
    header('Content-Type: application/json');
    echo json_encode(array_merge(['success' => false, 'message' => $message], $data));
    exit;
}
