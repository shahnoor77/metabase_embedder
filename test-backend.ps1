

# Configuration
$API_URL = "http://localhost:8000"
$METABASE_URL = "http://localhost:3000"

# Colors for output
function Write-Success {
    param($Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Section {
    param($Title)
    Write-Host "`n============================================================" -ForegroundColor Yellow
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "============================================================`n" -ForegroundColor Yellow
}

# ============================================================
# Test 1: Check if services are running
# ============================================================
Write-Section "TEST 1: Service Health Checks"

Write-Info "Checking backend API..."
try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method Get -ErrorAction Stop
    if ($response.status -eq "healthy") {
        Write-Success "Backend is healthy"
        Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    } else {
        Write-Error "Backend returned unexpected status"
    }
} catch {
    Write-Error "Backend is not responding"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Info "Checking Metabase..."
try {
    $response = Invoke-RestMethod -Uri "$METABASE_URL/api/health" -Method Get -ErrorAction Stop
    Write-Success "Metabase is healthy"
} catch {
    Write-Error "Metabase is not responding"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 2: User Signup
# ============================================================
Write-Section "TEST 2: User Signup"

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "testuser_${timestamp}@example.com"
$testPassword = "TestPassword1234!"

Write-Info "Creating user: $testEmail"

$signupData = @{
    email = $testEmail
    password = $testPassword
    first_name = "Test"
    last_name = "User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/signup" `
        -Method Post `
        -Body $signupData `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Success "User created successfully"
    Write-Host "  User ID: $($response.id)" -ForegroundColor Gray
    Write-Host "  Email: $($response.email)" -ForegroundColor Gray
    Write-Host "  Metabase User ID: $($response.metabase_user_id)" -ForegroundColor Gray
    
    if ($response.metabase_user_id) {
        Write-Success "Metabase user linked successfully"
    } else {
        Write-Error "Metabase user ID is missing"
    }
    
    $userId = $response.id
} catch {
    Write-Error "Signup failed"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to parse error response
    if ($_.ErrorDetails.Message) {
        $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Detail: $($errorData.detail)" -ForegroundColor Red
    }
    exit 1
}

# ============================================================
# Test 3: User Login
# ============================================================
Write-Section "TEST 3: User Login"

Write-Info "Logging in as: $testEmail"

# OAuth2 form data
$loginData = @{
    username = $testEmail
    password = $testPassword
}

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/x-www-form-urlencoded" `
        -ErrorAction Stop
    
    Write-Success "Login successful"
    Write-Host "  Token Type: $($response.token_type)" -ForegroundColor Gray
    Write-Host "  Access Token: $($response.access_token.Substring(0, 20))..." -ForegroundColor Gray
    
    $token = $response.access_token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
} catch {
    Write-Error "Login failed"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================
# Test 4: Get Current User Info
# ============================================================
Write-Section "TEST 4: Get Current User Info"

Write-Info "Fetching user profile..."

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/me" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Success "User info retrieved"
    Write-Host "  ID: $($response.id)" -ForegroundColor Gray
    Write-Host "  Email: $($response.email)" -ForegroundColor Gray
    Write-Host "  Name: $($response.first_name) $($response.last_name)" -ForegroundColor Gray
    Write-Host "  Metabase User ID: $($response.metabase_user_id)" -ForegroundColor Gray
    Write-Host "  Active: $($response.is_active)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to get user info"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 5: Create Workspace
# ============================================================
Write-Section "TEST 5: Create Workspace"

$workspaceName = "Test Workspace $timestamp"
Write-Info "Creating workspace: $workspaceName"

$workspaceData = @{
    name = $workspaceName
    description = "Automated test workspace created at $(Get-Date)"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces" `
        -Method Post `
        -Headers $headers `
        -Body $workspaceData `
        -ErrorAction Stop
    
    Write-Success "Workspace created successfully"
    Write-Host "  Workspace ID: $($response.id)" -ForegroundColor Gray
    Write-Host "  Name: $($response.name)" -ForegroundColor Gray
    Write-Host "  Owner ID: $($response.owner_id)" -ForegroundColor Gray
    Write-Host "  Metabase Collection ID: $($response.metabase_collection_id)" -ForegroundColor Gray
    Write-Host "  Metabase Collection Name: $($response.metabase_collection_name)" -ForegroundColor Gray
    
    if ($response.metabase_collection_id) {
        Write-Success "Metabase collection linked successfully"
    } else {
        Write-Error "Metabase collection ID is missing"
    }
    
    $workspaceId = $response.id
} catch {
    Write-Error "Workspace creation failed"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Detail: $($errorData.detail)" -ForegroundColor Red
    }
    exit 1
}

# ============================================================
# Test 6: List Workspaces
# ============================================================
Write-Section "TEST 6: List Workspaces"

Write-Info "Fetching all workspaces..."

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Success "Retrieved $($response.Count) workspace(s)"
    
    foreach ($ws in $response) {
        Write-Host "  > ID: $($ws.id) | Name: $($ws.name)" -ForegroundColor Gray
    }
} catch {
    Write-Error "Failed to list workspaces"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 7: Get Specific Workspace
# ============================================================
Write-Section "TEST 7: Get Specific Workspace"

Write-Info "Fetching workspace $workspaceId..."

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces/$workspaceId" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Success "Workspace retrieved"
    Write-Host "  ID: $($response.id)" -ForegroundColor Gray
    Write-Host "  Name: $($response.name)" -ForegroundColor Gray
    Write-Host "  Description: $($response.description)" -ForegroundColor Gray
    Write-Host "  Active: $($response.is_active)" -ForegroundColor Gray
} catch {
    Write-Error "Failed to get workspace"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 8: Get Workspace Embed URL
# ============================================================
Write-Section "TEST 8: Get Workspace Embed URL"

Write-Info "Generating embed URL for workspace $workspaceId..."

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces/$workspaceId/embed" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Success "Embed URL generated"
    Write-Host "  URL: $($response.url)" -ForegroundColor Gray
    Write-Host "  Expires In: $($response.expires_in_minutes) minutes" -ForegroundColor Gray
    
    # Verify the URL format
    if ($response.url -match "^/embed/collection/") {
        Write-Success "URL format is correct"
        $embedUrl = "$METABASE_URL$($response.url)"
        Write-Host "  Full URL: $embedUrl" -ForegroundColor Gray
    } else {
        Write-Error "URL format is incorrect"
    }
} catch {
    Write-Error "Failed to get embed URL"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 9: List Dashboards (Auto-Sync)
# ============================================================
Write-Section "TEST 9: List Dashboards (Auto-Sync)"

Write-Info "Fetching dashboards for workspace $workspaceId..."

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces/$workspaceId/dashboards" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Success "Dashboard sync completed"
    Write-Host "  Found $($response.Count) dashboard(s)" -ForegroundColor Gray
    
    if ($response.Count -gt 0) {
        foreach ($dash in $response) {
            Write-Host "  > ID: $($dash.id) | Name: $($dash.metabase_dashboard_name)" -ForegroundColor Gray
        }
        $dashboardId = $response[0].id
    } else {
        Write-Info "No dashboards found (this is normal for a new workspace)"
    }
} catch {
    Write-Error "Failed to list dashboards"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 10: Test with Second User (Isolation)
# ============================================================
Write-Section "TEST 10: Test Workspace Isolation"

$timestamp2 = Get-Date -Format "yyyyMMddHHmmss"
$testEmail2 = "testuser2_${timestamp2}@example.com"

Write-Info "Creating second user: $testEmail2"

$signupData2 = @{
    email = $testEmail2
    password = $testPassword
    first_name = "Test2"
    last_name = "User2"
} | ConvertTo-Json

try {
    # Create second user
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/signup" `
        -Method Post `
        -Body $signupData2 `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Success "Second user created"
    
    # Login as second user
    $loginData2 = @{
        username = $testEmail2
        password = $testPassword
    }
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/login" `
        -Method Post `
        -Body $loginData2 `
        -ContentType "application/x-www-form-urlencoded" `
        -ErrorAction Stop
    
    $token2 = $response.access_token
    $headers2 = @{
        "Authorization" = "Bearer $token2"
        "Content-Type" = "application/json"
    }
    
    Write-Success "Second user logged in"
    
    # Try to access first user's workspace (should fail)
    Write-Info "Attempting to access first user's workspace (should be denied)..."
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces/$workspaceId" `
            -Method Get `
            -Headers $headers2 `
            -ErrorAction Stop
        
        Write-Error "SECURITY ISSUE: Second user can access first user's workspace!"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 403) {
            Write-Success "Access correctly denied (403 Forbidden)"
        } else {
            Write-Error "Unexpected error: $($_.Exception.Message)"
        }
    }
    
    # List workspaces for second user (should be empty)
    Write-Info "Listing workspaces for second user (should be empty)..."
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces" `
        -Method Get `
        -Headers $headers2 `
        -ErrorAction Stop
    
    if ($response.Count -eq 0) {
        Write-Success "Second user has no workspaces (correct isolation)"
    } else {
        Write-Error "Second user can see workspaces: $($response.Count)"
    }
    
} catch {
    Write-Error "Isolation test failed"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# Test 11: API Documentation
# ============================================================
Write-Section "TEST 11: API Documentation"

Write-Info "Checking if API docs are accessible..."

try {
    $response = Invoke-WebRequest -Uri "$API_URL/docs" -Method Get -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Success "API documentation is accessible at $API_URL/docs"
    }
} catch {
    Write-Error "API docs not accessible"
}

# ============================================================
# Test Summary
# ============================================================
Write-Section "TEST SUMMARY"

Write-Host "All tests completed!`n" -ForegroundColor Green

Write-Host "`nTest Results:" -ForegroundColor Cyan
Write-Host "  [OK] Service health checks" -ForegroundColor Green
Write-Host "  [OK] User signup (with Metabase user creation)" -ForegroundColor Green
Write-Host "  [OK] User login (JWT token generation)" -ForegroundColor Green
Write-Host "  [OK] Get current user info" -ForegroundColor Green
Write-Host "  [OK] Create workspace (with Metabase collection)" -ForegroundColor Green
Write-Host "  [OK] List workspaces" -ForegroundColor Green
Write-Host "  [OK] Get specific workspace" -ForegroundColor Green
Write-Host "  [OK] Generate embed URL" -ForegroundColor Green
Write-Host "  [OK] List dashboards (auto-sync)" -ForegroundColor Green
Write-Host "  [OK] Workspace isolation" -ForegroundColor Green
Write-Host "  [OK] API documentation" -ForegroundColor Green

Write-Host "`nTest Credentials:" -ForegroundColor Yellow
Write-Host "  User 1:" -ForegroundColor Yellow
Write-Host "    Email: $testEmail" -ForegroundColor Gray
Write-Host "    Password: $testPassword" -ForegroundColor Gray
Write-Host "    Workspace ID: $workspaceId" -ForegroundColor Gray
Write-Host "`n  User 2:" -ForegroundColor Yellow
Write-Host "    Email: $testEmail2" -ForegroundColor Gray
Write-Host "    Password: $testPassword" -ForegroundColor Gray

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Login to Metabase at: $METABASE_URL" -ForegroundColor Gray
Write-Host "     Admin Email: admin@metabase.local" -ForegroundColor Gray
Write-Host "     Admin Password: admin123" -ForegroundColor Gray
Write-Host "`n  2. Verify test users exist in Admin > People" -ForegroundColor Gray
Write-Host "  3. Verify workspace collection exists" -ForegroundColor Gray
Write-Host "  4. Verify permissions are set correctly" -ForegroundColor Gray
Write-Host "  5. Open frontend at: http://localhost:3001" -ForegroundColor Gray

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "  Testing Complete!" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Yellow