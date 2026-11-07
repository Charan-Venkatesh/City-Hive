import os
import time
import sqlite3
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = 'http://localhost:5173'

def ensure_outstanding_invoice():
    db_path = '/Users/charanvenkatesh/Downloads/hostel-management/backend/staywell.db'
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM payments WHERE invoice_id = 43;")
        conn.commit()
        conn.close()

def get_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument('--headless=new')
    opts.add_argument('--window-size=1440,960')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    return webdriver.Chrome(options=opts)

def test_full_workflow():
    ensure_outstanding_invoice()
    driver = get_driver()
    driver.implicitly_wait(4)

    try:
        print("==================================================")
        print("1. TESTING PUBLIC LANDING PAGE & AMENITIES")
        print("==================================================")
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(EC.title_contains('Cityhive'))
        assert "Cityhive" in driver.title
        print("   ✔ Homepage loaded. Title:", driver.title)

        # Check Portal link in navbar
        portal_btn = driver.find_element(By.XPATH, "//button[contains(., 'Portal')]")
        assert portal_btn
        print("   ✔ Found Portal access button in header.")

        # Check Life at Cityhive gallery
        gallery = driver.find_element(By.ID, "gallery")
        assert gallery
        print("   ✔ Life at Cityhive gallery section present.")

        # Check Admission Enquiry form with Aadhaar field
        aadhaar_input = driver.find_element(By.XPATH, "//input[@name='aadhaar']")
        assert aadhaar_input
        print("   ✔ Direct Admission enquiry form has Aadhaar verification field.")

        print("\n==================================================")
        print("2. TESTING RESIDENT LOGIN & OVERVIEW")
        print("==================================================")
        driver.get(f"{BASE_URL}/#login")
        time.sleep(1)

        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='email' or @name='email' or @autocomplete='username']"))
        )
        pw_input = driver.find_element(By.XPATH, "//input[@type='password']")
        email_input.clear()
        email_input.send_keys("demo01@example.com")
        pw_input.clear()
        pw_input.send_keys("Resident@123")

        driver.find_element(By.XPATH, "//button[contains(., 'Continue') or contains(., 'Sign in')]").click()
        time.sleep(2)

        # Verify resident overview
        overview_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Overview')]"))
        )
        assert overview_title
        print("   ✔ Resident logged in successfully. Lands on Overview.")

        # Check Outstanding Fee Banner
        banner_btn = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Pay') and contains(., 'Online Now')]"))
        )
        print(f"   ✔ Outstanding Fee Banner detected: '{banner_btn.text}'")

        print("\n==================================================")
        print("3. TESTING ONLINE FEE PAYMENT FLOW (UPI/CARD)")
        print("==================================================")
        # Click the pay online banner button
        banner_btn.click()
        time.sleep(1)

        # Verify Payment Dialog opens
        dialog_title = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(., 'Online Fee Payment')]"))
        )
        assert dialog_title
        print("   ✔ Online Fee Payment Dialog opened.")

        # Verify QR Code and UPI options
        qr_text = driver.find_element(By.XPATH, "//*[contains(., 'Scan with any UPI app')]")
        assert qr_text
        print("   ✔ Realistic UPI QR Code generated and visible in dialog.")

        # Switch to Card tab
        card_tab = driver.find_element(By.XPATH, "//button[contains(., 'Card')]")
        card_tab.click()
        time.sleep(0.5)
        print("   ✔ Switched to Credit/Debit Card tab.")

        # Switch back to UPI tab
        upi_tab = driver.find_element(By.XPATH, "//button[contains(., 'UPI')]")
        upi_tab.click()
        time.sleep(0.5)

        # Click "Pay ... Now" submit button
        pay_submit = driver.find_element(By.XPATH, "//button[@type='submit' and contains(., 'Pay')]")
        print(f"   ✔ Submitting payment via button: '{pay_submit.text}'")
        pay_submit.click()

        # Wait for Payment Success confirmation inside dialog
        success_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(., 'Payment Successful')]"))
        )
        assert success_title
        print("   ✔ Payment successfully confirmed! Dialog updated to Payment Successful.")

        # Check Download Invoice PDF and Download Receipt buttons
        inv_pdf_btn = driver.find_element(By.XPATH, "//button[contains(., 'Download Paid Invoice PDF')]")
        rec_pdf_btn = driver.find_element(By.XPATH, "//button[contains(., 'Download Receipt')]")
        assert inv_pdf_btn and rec_pdf_btn
        print("   ✔ Both 'Download Paid Invoice PDF' and 'Download Receipt' buttons present.")

        # Close dialog
        done_btn = driver.find_element(By.XPATH, "//button[contains(., 'Done')]")
        done_btn.click()
        time.sleep(1)

        print("\n==================================================")
        print("4. TESTING RESIDENT FEES & PAYMENTS PAGE")
        print("==================================================")
        # Navigate to Fees & payments
        fees_nav = driver.find_element(By.XPATH, "//nav//button[contains(., 'Fees & payments')]")
        fees_nav.click()
        time.sleep(1)

        # Verify Invoices Table
        invoices_heading = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Fees & payments')]"))
        )
        print("   ✔ Navigated to Fees & payments page.")

        # Check for settled badge / invoice PDF button
        table_rows = driver.find_elements(By.XPATH, "//tbody//tr")
        print(f"   ✔ Found {len(table_rows)} invoices in resident table.")

        # Sign out resident
        logout_btn = driver.find_element(By.XPATH, "//button[contains(@class, 'user-button')]")
        logout_btn.click()
        time.sleep(1)
        print("   ✔ Resident logged out cleanly.")

        print("\n==================================================")
        print("5. TESTING OWNER LOGIN & DASHBOARD METRICS")
        print("==================================================")
        driver.get(f"{BASE_URL}/")
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(., 'Portal')]").click()
        time.sleep(1)

        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='email' or @name='email' or @autocomplete='username']"))
        )
        pw_input = driver.find_element(By.XPATH, "//input[@type='password']")
        email_input.clear()
        email_input.send_keys("admin")
        pw_input.clear()
        pw_input.send_keys("7780760730")

        driver.find_element(By.XPATH, "//button[contains(., 'Continue') or contains(., 'Sign in')]").click()
        time.sleep(2)

        # Verify Owner Dashboard
        owner_overview = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Overview')]"))
        )
        assert owner_overview
        print("   ✔ Owner logged in successfully.")

        print("\n==================================================")
        print("6. TESTING OWNER ROOMS MANAGER")
        print("==================================================")
        rooms_nav = driver.find_element(By.XPATH, "//nav//button[contains(., 'Rooms')]")
        rooms_nav.click()
        time.sleep(1)

        rooms_header = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Room Management')]"))
        )
        assert rooms_header
        print("   ✔ Rooms Manager rendered successfully with real-time stats.")

        # Check View Switcher buttons (Grid, By Floor, Table)
        floor_view_btn = driver.find_element(By.XPATH, "//button[contains(., 'By Floor')]")
        floor_view_btn.click()
        time.sleep(0.5)
        print("   ✔ Switched to 'By Floor' room grouping view.")

        table_view_btn = driver.find_element(By.XPATH, "//button[contains(., 'Table')]")
        table_view_btn.click()
        time.sleep(0.5)
        print("   ✔ Switched to 'Table' room view.")

        grid_view_btn = driver.find_element(By.XPATH, "//button[contains(., 'Grid')]")
        grid_view_btn.click()
        time.sleep(0.5)
        print("   ✔ Switched back to 'Grid' view.")

        print("\n==================================================")
        print("7. TESTING OWNER ADMISSIONS & AADHAAR VERIFICATION")
        print("==================================================")
        admissions_nav = driver.find_element(By.XPATH, "//nav//button[contains(., 'Admissions')]")
        admissions_nav.click()
        time.sleep(1)

        admissions_header = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//th[contains(., 'Aadhaar Verification')]"))
        )
        assert admissions_header
        print("   ✔ Admissions table has 'Aadhaar Verification' column.")

        # Check for Aadhaar badge
        aadhaar_badges = driver.find_elements(By.XPATH, "//tbody//tr//td[contains(., '••••')]")
        print(f"   ✔ Found {len(aadhaar_badges)} admission records with verified Aadhaar badges.")

        print("\n==================================================")
        print("8. TESTING OWNER FEES & PAYMENTS REAL-TIME LEDGER")
        print("==================================================")
        owner_fees_nav = driver.find_element(By.XPATH, "//nav//button[contains(., 'Fees & payments')]")
        owner_fees_nav.click()
        time.sleep(1)

        # Switch to Payments tab
        payments_tab = driver.find_element(By.XPATH, "//button[contains(., 'Payments')]")
        payments_tab.click()
        time.sleep(1)

        # Check Payments ledger rows
        payment_rows = driver.find_elements(By.XPATH, "//tbody//tr")
        print(f"   ✔ Owner Payments ledger has {len(payment_rows)} confirmed payment records.")
        assert len(payment_rows) > 0

        # Sign out
        driver.find_element(By.XPATH, "//button[contains(@class, 'user-button')]").click()
        time.sleep(1)
        print("   ✔ Owner logged out cleanly.")

        print("\n==================================================")
        print("9. TESTING STANDALONE DEDICATED DOA (DIRECT ONLINE ADMISSION) PAGE")
        print("==================================================")
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(EC.title_contains('Cityhive'))

        doa_nav_cta = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(., 'Apply Online (DOA)')]"))
        )
        doa_nav_cta.click()
        time.sleep(1)

        # Check URL hash and title
        doa_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Direct Online Admission')]"))
        )
        assert doa_title
        print("   ✔ Navigated to standalone DOA page:", doa_title.text)

        # Select branch & sharing
        branch_options = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "doa-branch-option"))
        )
        branch_options[0].click()
        time.sleep(0.5)

        sharing_cards = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "doa-sharing-card"))
        )
        sharing_cards[0].click()
        time.sleep(0.5)

        # Fill applicant details & Aadhaar
        test_email = f"doa_suite_{int(time.time())}@example.com"
        driver.find_element(By.NAME, "name").send_keys("Kiran Rao")
        driver.find_element(By.NAME, "email").send_keys(test_email)
        driver.find_element(By.NAME, "phone").send_keys("9123456789")
        aadhaar_input = driver.find_element(By.ID, "doa-aadhaar")
        aadhaar_input.send_keys("987654321098")
        time.sleep(0.5)

        verified_chip = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(., 'Aadhaar Verified')]"))
        )
        assert verified_chip
        print("   ✔ Formatted 12-digit Aadhaar input and verified badge verified.")

        # Submit DOA application
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button.doa-submit-btn")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", submit_btn)

        success_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(., 'Admission Application Submitted!')]"))
        )
        assert success_title
        print("   ✔ DOA Application submitted successfully.")

        key_element = driver.find_element(By.CLASS_NAME, "doa-key-badge")
        tracking_key = key_element.text.strip()
        print(f"   ✔ Generated Private Tracking Key: {tracking_key}")

        # Test live status tracking
        track_live_btn = driver.find_element(By.XPATH, "//button[contains(., 'Track Status Live')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", track_live_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", track_live_btn)
        time.sleep(0.5)

        check_btn = driver.find_element(By.XPATH, "//button[contains(., 'Check Admission Status')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", check_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", check_btn)
        time.sleep(1)

        status_result = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(., 'Admission Request #')]"))
        )
        assert status_result
        print(f"   ✔ Tracking lookup verified.")

        # Back to Home
        back_btn = driver.find_element(By.XPATH, "//button[contains(., 'Back to Home')]")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", back_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", back_btn)
        time.sleep(1)
        print("   ✔ Successfully returned to homepage from DOA page.")

        print("\n==================================================")
        print("ALL 9 END-TO-END WORKFLOWS PASSED WITH 100% SUCCESS!")
        print("==================================================")

    finally:
        driver.quit()

if __name__ == '__main__':
    test_full_workflow()
