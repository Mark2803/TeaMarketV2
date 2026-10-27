$ErrorActionPreference = "Stop"
$ApiBase = "http://localhost:3000/api"
$failed = $false

function Pass($m) { Write-Host "[PASS] $m" -ForegroundColor Green }
function Fail($m) { Write-Host "[FAIL] $m" -ForegroundColor Red; $script:failed = $true }
function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }

$visitorId = [guid]::NewGuid().ToString()
$sessionId = [guid]::NewGuid().ToString()

Info "Visitor: $visitorId"
Info "Session: $sessionId"

$events = @(
    @{ eventType="page_view";        path="/" },
    @{ eventType="product_view";     path="/products/analytics-test" },
    @{ eventType="add_to_cart";      path="/products/analytics-test"; quantity=1 },
    @{ eventType="checkout_started"; path="/checkout" }
)

foreach ($event in $events) {
    $payload = @{
        sessionId = $sessionId
        visitorId = $visitorId
        eventType = $event.eventType
        path = $event.path
        session = @{
            landingPath = "/"
            referrer = "https://example.com/"
            source = "analytics-smoke-test"
            medium = "test"
            campaign = "smoke"
            deviceType = "desktop"
        }
    }

    if ($event.ContainsKey("quantity")) {
        $payload.quantity = $event.quantity
    }

    try {
        $response = Invoke-RestMethod `
            -Uri "$ApiBase/analytics/events" `
            -Method Post `
            -ContentType "application/json" `
            -Body ($payload | ConvertTo-Json -Depth 6)

        if ($response.data.accepted -eq $true) {
            Pass "$($event.eventType) accepted"
        } else {
            Fail "$($event.eventType): backend did not return accepted=true"
        }
    }
    catch {
        $details = ""
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $details = $reader.ReadToEnd()
            }
        } catch {}
        Fail "$($event.eventType): $($_.Exception.Message) $details"
    }
}

Write-Host ""
Info "Check Prisma Studio -> analytics_events for session_id:"
Write-Host $sessionId -ForegroundColor Yellow
Write-Host ""

if ($failed) {
    Write-Host "ANALYTICS EVENT TEST: FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "ANALYTICS EVENT TEST: PASS" -ForegroundColor Green
exit 0
