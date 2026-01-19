<?php
// includes/bootstrap.php

// Central bootstrap for API endpoints.
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/csrf.php';

// Basic security headers (safe defaults for a small PHP app)
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

// If running under HTTPS, you can tighten cookies by setting secure=true in config.php.

