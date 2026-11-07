import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = 'http://localhost:5173'

def get_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument('--headless=new')
    opts.add_argument('--window-size=1440,960')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    return webdriver.Chrome(options=opts)

def test_doa_separate_page():
    driver = get_driver()
    driver.implicitly_wait(4)

    try:
        print("==================================================")
        print("TEST 1: NAVIGATING FROM HOMEPAGE TO DEDICATED DOA PAGE")
        print("==================================================")
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(EC.title_contains('Cityhive'))
        print("   ✔ Home loaded:", driver.title)

        # Click the "Apply Online (DOA)" button in the navigation header
        doa_nav_cta = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(., 'Apply Online (DOA)')]"))
        )
        assert doa_nav_cta
        print("   ✔ Found 'Apply Online (DOA)' navbar CTA button")
        doa_nav_cta.click()
        time.sleep(1)

        # Check URL hash or DOA page title
        assert "#doa" in driver.current_url or "doa" in driver.current_url
        doa_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Direct Online Admission')]"))
        )
        assert doa_title
        print("   ✔ Successfully navigated to dedicated DOA page:", doa_title.text)

        # Check trust badges
        trust_badge = driver.find_element(By.XPATH, "//*[contains(., 'UIDAI Compliant Aadhaar Verification')]")
        assert trust_badge
        print("   ✔ Found UIDAI Aadhaar Verification trust badge")

        print("==================================================")
        print("TEST 2: VERIFYING BRANCH & SHARING SELECTION")
        print("==================================================")
        # Select first branch option
        branch_options = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "doa-branch-option"))
        )
        assert len(branch_options) > 0
        print(f"   ✔ Found {len(branch_options)} available branches in DOA selector")
        branch_options[0].click()
        time.sleep(0.5)

        # Select a sharing option card
        sharing_cards = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "doa-sharing-card"))
        )
        assert len(sharing_cards) > 0
        print(f"   ✔ Found {len(sharing_cards)} sharing options. Selecting first option.")
        sharing_cards[0].click()
        time.sleep(0.5)

        print("==================================================")
        print("TEST 3: FILLING APPLICANT DETAILS & AADHAAR VERIFICATION")
        print("==================================================")
        test_email = f"doa_applicant_{int(time.time())}@example.com"
        test_name = "Vikram Aditya"
        test_phone = "9876543210"

        driver.find_element(By.NAME, "name").send_keys(test_name)
        driver.find_element(By.NAME, "email").send_keys(test_email)
        driver.find_element(By.NAME, "phone").send_keys(test_phone)
        driver.find_element(By.NAME, "emergency_contact").send_keys("Aditya Senior (Father)")
        driver.find_element(By.NAME, "emergency_phone").send_keys("9876500000")
        print("   ✔ Contact details entered")

        # Test Aadhaar 12-digit input & real-time formatting
        aadhaar_input = driver.find_element(By.ID, "doa-aadhaar")
        aadhaar_input.send_keys("543210987654")
        time.sleep(0.5)

        formatted_val = aadhaar_input.get_attribute("value")
        print(f"   ✔ Formatted Aadhaar output: '{formatted_val}'")
        assert "5432 1098 7654" in formatted_val

        verified_chip = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(., 'Aadhaar Verified')]"))
        )
        assert verified_chip
        print("   ✔ 'Aadhaar Verified' badge appeared successfully")

        # Special note
        driver.find_element(By.NAME, "message").send_keys("Need quiet room on 2nd or 3rd floor.")

        print("==================================================")
        print("TEST 4: SUBMITTING DIRECT ONLINE ADMISSION (DOA)")
        print("==================================================")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button.doa-submit-btn")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", submit_btn)

        # Wait for success confirmation card
        success_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(., 'Admission Application Submitted!')]"))
        )
        assert success_title
        print("   ✔ Confirmation screen received: 'Admission Application Submitted!'")

        key_element = driver.find_element(By.CLASS_NAME, "doa-key-badge")
        tracking_key = key_element.text.strip()
        print(f"   ✔ Generated Private Tracking Key: {tracking_key}")
        assert len(tracking_key) >= 32

        print("==================================================")
        print("TEST 5: TRACKING THE SUBMITTED ADMISSION")
        print("==================================================")
        track_live_btn = driver.find_element(By.XPATH, "//button[contains(., 'Track Status Live')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", track_live_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", track_live_btn)
        time.sleep(0.5)

        # Check track input fields pre-populated
        email_input = driver.find_element(By.ID, "track-email")
        key_input = driver.find_element(By.ID, "track-key")
        assert email_input.get_attribute("value") == test_email
        assert key_input.get_attribute("value") == tracking_key
        print("   ✔ Tracking inputs correctly populated from submission")

        # Click Check Admission Status
        check_btn = driver.find_element(By.XPATH, "//button[contains(., 'Check Admission Status')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", check_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", check_btn)
        time.sleep(1)

        status_result = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(., 'Admission Request #')]"))
        )
        assert status_result
        print(f"   ✔ Status lookup verified: {status_result.text}")

        print("==================================================")
        print("TEST 6: RETURNING TO HOMEPAGE")
        print("==================================================")
        back_btn = driver.find_element(By.XPATH, "//button[contains(., 'Back to Home')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", back_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", back_btn)
        time.sleep(1)

        assert driver.find_element(By.ID, "gallery")
        print("   ✔ Successfully navigated back to main website")

        print("==================================================")
        print("ALL 6 TESTS IN DEDICATED DOA PAGE PASSED 100%!")
        print("==================================================")

    finally:
        driver.quit()

if __name__ == '__main__':
    test_doa_separate_page()
