"""Selenium smoke test: wrong-password rejection and the public homepage, in real Chrome.
Run through e2e/run_selenium.sh, which starts the isolated stack first."""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE = 'http://127.0.0.1:5190/'

def make_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument('--headless=new'); opts.add_argument('--window-size=1280,900')
    return webdriver.Chrome(options=opts)

def click_text(driver, text):
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, f"(//button[contains(., '{text}')])[1]"))).click()

def test_homepage_and_wrong_password():
    driver = make_driver()
    try:
        driver.get(BASE)
        WebDriverWait(driver, 10).until(EC.title_contains('Cityhive'))
        click_text(driver, 'Management sign in')
        driver.find_element(By.XPATH, "//input[@autocomplete='username']").send_keys('admin')
        driver.find_element(By.XPATH, "//input[@type='password']").send_keys('wrong-password')
        click_text(driver, 'Continue securely')
        alert = WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.XPATH, "//*[contains(., 'Incorrect email or password')]")))
        assert alert
    finally:
        driver.quit()
