from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client, Client
from geopy.geocoders import Nominatim
import time
import datetime
import re

# --- AYARLAR ---
SUPABASE_URL = "https://ugvwxzehwpfszvvzoyim.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndnd4emVod3Bmc3p2dnpveWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Njk0NTYsImV4cCI6MjA3OTE0NTQ1Nn0._9BKiHzXZVWmXTZdFc2Fllb9qVlpS1fPVpVeUh87O-c"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

geolocator = Nominatim(user_agent="event_radar_biletinial_bot")

# --- FONKSİYONLAR ---
def get_coordinates_turkey(venue_name):
    try:
        location = geolocator.geocode(venue_name, country_codes='tr', timeout=3)
        if location: return location.latitude, location.longitude
        return 41.0082, 28.9784 
    except: return 41.0082, 28.9784

def parse_date(date_text):
    # Biletinial Formatı Genelde: "20 Kasım 2025 Pazartesi 21:00"
    months = {"Ocak": 1, "Şubat": 2, "Mart": 3, "Nisan": 4, "Mayıs": 5, "Haziran": 6, "Temmuz": 7, "Ağustos": 8, "Eylül": 9, "Ekim": 10, "Kasım": 11, "Aralık": 12}
    try:
        parts = date_text.split()
        day = int(parts[0])
        month = months.get(parts[1], 1)
        year = int(parts[2])
        
        time_part = parts[-1] # 21:00
        hour, minute = map(int, time_part.split(':'))
        
        return datetime.datetime(year, month, day, hour, minute).isoformat()
    except:
        # Hata olursa yarına at
        return (datetime.datetime.now() + datetime.timedelta(days=1)).isoformat()

def scrape_biletinial():
    print("🤖 Biletinial Botu Başlatılıyor...")
    
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--headless') 

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    # Tarayacağımız Kategoriler

    urls = [
        "https://biletinial.com/tr-tr/muzik/ankara",
        "https://biletinial.com/tr-tr/tiyatro/ankara",
        "https://biletinial.com/tr-tr/spor/ankara"
     ]
    

    try:
        for url in urls:
            driver.get(url)
            print(f"🌐 {url} taranıyor...")
            time.sleep(5)

            # Etkinlik Kartlarını Bul (Biletinial yapısına göre)
            # class="event-list-item" veya benzeri
            events = driver.find_elements(By.CSS_SELECTOR, ".event-list-item, .movie-item")
            
            print(f"🔍 {len(events)} etkinlik bulundu.")

            for event in events[:20]: # Sayfa başı ilk 20 taneyi al (Hız için)
                try:
                    # Başlık
                    title = event.find_element(By.CSS_SELECTOR, ".event-name, .movie-name").text
                    
                    # Mekan
                    venue = event.find_element(By.CSS_SELECTOR, ".place, .venue").text
                    
                    # Link
                    link_elem = event.find_element(By.TAG_NAME, "a")
                    ticket_url = link_elem.get_attribute("href")
                    
                    # Resim
                    try:
                        img_elem = event.find_element(By.TAG_NAME, "img")
                        image_url = img_elem.get_attribute("data-src") or img_elem.get_attribute("src")
                    except: image_url = ""

                    # Tarih ve Fiyatı listede yazmaz, detaya girmeden varsayılan atıyoruz
                    # Detaya girmek botu çok yavaşlatır.
                    # İleri seviye botta her linke tıklayıp detay çekeceğiz.
                    # Şimdilik 'Yarın Akşam' varsayımıyla listeyi dolduruyoruz.
                    iso_date = (datetime.datetime.now() + datetime.timedelta(days=1)).replace(hour=20, minute=0).isoformat()
                    
                    # Konum
                    lat, lng = get_coordinates_turkey(venue)

                    # Kategori Belirleme
                    category = "Tiyatro" if "tiyatro" in url else "Müzik"

                    data = {
                        "title": title,
                        "venue_name": venue,
                        "category": category,
                        "price": "Biletinial'da", # Fiyat detayda yazar
                        "start_time": iso_date,
                        "ticket_url": ticket_url,
                        "image_url": image_url,
                        "description": "Biletinial üzerinden çekildi.",
                        "lat": lat,
                        "lng": lng,
                        "is_approved": False,
                        "address": venue,
                        "sold_out": False
                    }

                    # Duplicate Kontrolü (URL ile)
                    existing = supabase.table("events").select("id").eq("ticket_url", ticket_url).execute()
                    if not existing.data:
                        supabase.table("events").insert(data).execute()
                        print(f"✅ Eklendi: {title}")
                    else:
                        print(f"♻️ Zaten var: {title}")

                except Exception as e:
                    continue
            
            time.sleep(2)

    except Exception as e:
        print(f"Hata: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_biletinial()
    # GitHub Sync Testi v1