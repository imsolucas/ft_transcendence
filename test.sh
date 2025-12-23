#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_KEY="ft_66f88b661cbf4b0b310bb3508d9fae11bcde3a4714c7facbb1f51bd33e5c2ad1"
BASE_URL="https://localhost:8443"
TEST_USERNAME="Alice"  # Use a username that exists in your database

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Function to print test header
print_test() {
    TOTAL=$((TOTAL + 1))
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test $TOTAL: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check HTTP response
check_response() {
    local test_name="$1"
    local expected_status="$2"
    local response_file="$3"
    local required_fields="$4"
    
    # Get HTTP status code (curl -w appends \n%{http_code} to the output)
    # Read the file content
    local file_content=$(cat "$response_file")
    
    # Split by newline - status code should be on the last line
    # Handle case where there's a newline before status code but no newline after
    local http_code=""
    local response_body=""
    
    # Try to get the last line (most reliable)
    local last_line=$(echo "$file_content" | tail -n1 | tr -d '\n\r ')
    
    # Check if last line is a 3-digit number
    if [[ "$last_line" =~ ^[0-9]{3}$ ]]; then
        http_code="$last_line"
        # Response body is everything except the last line
        response_body=$(echo "$file_content" | head -n -1)
    else
        # Status code might be at the end of a single line
        # Extract last 3 digits from the entire content
        http_code=$(echo "$file_content" | grep -oE '[0-9]{3}$')
        
        # If that didn't work, try extracting from the raw end
        if [ -z "$http_code" ] || ! [[ "$http_code" =~ ^[0-9]{3}$ ]]; then
            # Get last 4 bytes and extract 3 digits
            local last_chars=$(tail -c 4 "$response_file")
            http_code=$(echo "$last_chars" | tr -d '\n\r ' | grep -oE '[0-9]{3}' | tail -1)
        fi
        
        # Remove status code from response body
        response_body=$(echo "$file_content" | sed "s/\n*${http_code}\$//" | sed "s/${http_code}\$//" | sed 's/[[:space:]]*$//')
    fi
    
    # Final validation
    if ! [[ "$http_code" =~ ^[0-9]{3}$ ]]; then
        http_code="000"  # Invalid code
    fi
    
    echo -e "${YELLOW}HTTP Status: $http_code${NC}"
    
    # Check if jq is available for JSON parsing
    if command -v jq &> /dev/null; then
        echo -e "${YELLOW}Response:${NC}"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        echo -e "${YELLOW}Response:${NC}"
        echo "$response_body"
    fi
    
    # Validate HTTP status code
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ HTTP Status: PASS (Expected: $expected_status, Got: $http_code)${NC}"
    else
        echo -e "${RED}✗ HTTP Status: FAIL (Expected: $expected_status, Got: $http_code)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
    
    # Check for error in response body (but allow errors for 404/401 as they're expected)
    if echo "$response_body" | grep -q '"error"'; then
        # 404 and 401 responses are expected to have error messages
        if [ "$expected_status" = "404" ] || [ "$expected_status" = "401" ]; then
            local error_msg=$(echo "$response_body" | grep -oP '"error"\s*:\s*"[^"]*"' | head -1)
            echo -e "${GREEN}✓ Expected error in response: $error_msg${NC}"
        else
            local error_msg=$(echo "$response_body" | grep -oP '"error"\s*:\s*"[^"]*"' | head -1)
            echo -e "${RED}✗ Error in response: $error_msg${NC}"
            FAILED=$((FAILED + 1))
            return 1
        fi
    fi
    
    # Check required fields if specified
    if [ -n "$required_fields" ]; then
        local missing_fields=""
        IFS=',' read -ra FIELDS <<< "$required_fields"
        for field in "${FIELDS[@]}"; do
            if ! echo "$response_body" | grep -q "\"$field\""; then
                missing_fields="$missing_fields $field"
            fi
        done
        
        if [ -n "$missing_fields" ]; then
            echo -e "${RED}✗ Missing required fields:$missing_fields${NC}"
            FAILED=$((FAILED + 1))
            return 1
        else
            echo -e "${GREEN}✓ Required fields present: $required_fields${NC}"
        fi
    fi
    
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓ Test PASSED${NC}"
    return 0
}

# Function to run a test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local required_fields="$5"
    local use_api_key="${6:-true}"  # Default to true, can be set to false
    local temp_file=$(mktemp)
    
    print_test "$test_name"
    echo -e "${YELLOW}Endpoint: $method $endpoint${NC}"
    
    # Build curl command with optional API key header
    # Make the request and capture both response body and HTTP code
    if [ "$method" = "GET" ]; then
        if [ "$use_api_key" = "true" ] && [ -n "$API_KEY" ]; then
            curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
                -H "X-API-Key: $API_KEY" \
                -k > "$temp_file" 2>&1
        else
            curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
                -k > "$temp_file" 2>&1
        fi
    else
        if [ "$use_api_key" = "true" ] && [ -n "$API_KEY" ]; then
            curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "X-API-Key: $API_KEY" \
                -H "Content-Type: application/json" \
                -k > "$temp_file" 2>&1
        else
            curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -k > "$temp_file" 2>&1
        fi
    fi
    
    check_response "$test_name" "$expected_status" "$temp_file" "$required_fields"
    local result=$?
    
    rm -f "$temp_file"
    return $result
}

# Start testing
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Public API Test Suite                                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${YELLOW}Base URL: $BASE_URL${NC}"
echo -e "${YELLOW}API Key: ${API_KEY:0:20}...${NC}"
echo -e "${YELLOW}Test Username: $TEST_USERNAME${NC}"

# Test 1: Get Public User Profile
run_test "Get Public User Profile" \
    "GET" \
    "/api/public/users/$TEST_USERNAME" \
    "200" \
    "id,username,avatar,status"

# Test 2: Get Public Matches Listing
run_test "Get Public Matches Listing" \
    "GET" \
    "/api/public/matches?page=1&limit=5" \
    "200" \
    "matches,pagination"

# Test 3: Get Public Match Details
run_test "Get Public Match Details" \
    "GET" \
    "/api/public/matches/1" \
    "200" \
    "id,player1DisplayName,player2DisplayName,player1Score,player2Score"

# Test 4: Get Public Tournaments Listing
run_test "Get Public Tournaments Listing" \
    "GET" \
    "/api/public/tournaments?page=1&limit=5" \
    "200" \
    "tournaments,pagination"

# Test 5: Get Public Leaderboard
run_test "Get Public Leaderboard" \
    "GET" \
    "/api/public/leaderboard?limit=10" \
    "200" \
    "leaderboard,limit"

# Test 6: Get Public User Statistics
run_test "Get Public User Statistics" \
    "GET" \
    "/api/public/stats/$TEST_USERNAME" \
    "200" \
    "username,wins,losses,totalMatches,winRate"

# Test 7: Test with invalid username (should return 404)
run_test "Get Public User Profile (Invalid Username)" \
    "GET" \
    "/api/public/users/nonexistentuser12345" \
    "404" \
    ""

# Test 8: Test with invalid match ID (should return 404)
run_test "Get Public Match Details (Invalid Match ID)" \
    "GET" \
    "/api/public/matches/99999" \
    "404" \
    ""

# Test 9: Test without API key (should return 401)
run_test "Get Public User Profile (No API Key)" \
    "GET" \
    "/api/public/users/$TEST_USERNAME" \
    "401" \
    "" \
    "false"

# Test 10: Test with invalid API key (should return 401)
API_KEY_BACKUP="$API_KEY"
API_KEY="invalid_key_12345"
run_test "Get Public User Profile (Invalid API Key)" \
    "GET" \
    "/api/public/users/$TEST_USERNAME" \
    "401" \
    ""
API_KEY="$API_KEY_BACKUP"

# Print summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                            Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Total:  $TOTAL${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                         All Tests PASSED! ✓                                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "\n${RED}╔══════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                      Some Tests FAILED! ✗                                         ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
