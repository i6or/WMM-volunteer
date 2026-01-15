# API Connection Test Script
Write-Host "=== Testing API Connection ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"
$endpoints = @(
    "/api/health",
    "/api/version",
    "/api/debug/db-connection",
    "/api/programs"
)

foreach ($endpoint in $endpoints) {
    $url = "$baseUrl$endpoint"
    Write-Host "`nTesting: $url" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode) {
            Write-Host "  Status: $statusCode" -ForegroundColor Red
        } else {
            Write-Host "  Error: Connection failed - Server may not be running" -ForegroundColor Red
            Write-Host "  Details: $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan




