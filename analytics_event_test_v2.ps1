$ErrorActionPreference = "Stop"
$ApiBase = "http://localhost:3000/api"
$failed = $false
function Pass($m){Write-Host "[PASS] $m" -ForegroundColor Green}
function Fail($m){Write-Host "[FAIL] $m" -ForegroundColor Red;$script:failed=$true}
function Info($m){Write-Host "[INFO] $m" -ForegroundColor Cyan}

$visitorId=[guid]::NewGuid().ToString()
$sessionId=[guid]::NewGuid().ToString()
$source="analytics-smoke-test"
Info "Visitor: $visitorId"
Info "Session: $sessionId"

$events=@(
  @{eventType="page_view";path="/"},
  @{eventType="product_view";path="/products/test"},
  @{eventType="add_to_cart";path="/products/test";quantity=1},
  @{eventType="checkout_started";path="/checkout"}
)

foreach($e in $events){
  $payload=@{
    visitorId=$visitorId; sessionId=$sessionId; eventType=$e.eventType; path=$e.path;
    source=$source; medium="test"; campaign="smoke"; referrer="https://example.com/";
    landingPath="/"; deviceType="desktop"
  }
  if($e.ContainsKey("quantity")){$payload.quantity=$e.quantity}
  try {
    Invoke-RestMethod -Uri "$ApiBase/analytics/events" -Method Post -ContentType "application/json" -Body ($payload|ConvertTo-Json) | Out-Null
    Pass "$($e.eventType) accepted"
  } catch { Fail "$($e.eventType): $($_.Exception.Message)" }
}
Write-Host ""
if($failed){Write-Host "ANALYTICS EVENT TEST: FAIL" -ForegroundColor Red; exit 1}
else{Write-Host "ANALYTICS EVENT TEST: PASS" -ForegroundColor Green; exit 0}
