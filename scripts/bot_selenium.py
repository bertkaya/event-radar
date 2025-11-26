from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client, Client
from geopy.geocoders import Nominatim
import time
import datetime
import re

# --- 1. AYARLAR ---
# LÜTFEN GÜNCEL KEY'İNİ BURAYA YAPIŞTIR (Güvenlik için eskileri sildim)
SUPABASE_URL = "https://ugvwxzehwpfszvvzoyim.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndnd4emVod3Bmc3p2dnpveWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Njk0NTYsImV4cCI6MjA3OTE0NTQ1Nn0._9BKiHzXZVWmXTZdFc2Fllb9qVlpS1fPVpVeUh87O-c"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Konum Bulucu (Sadece Türkiye Odaklı)
geolocator = Nominatim(user_agent="event_radar_bot_v5_tr")

# --- YARDIMCI FONKSİYONLAR ---

def get_coordinates_turkey_smart(venue_name):
    """
    Mekanı SADECE TÜRKİYE sınırları içinde arar.
    Şehir zorlaması yapmaz, mekanın kendi konumunu bulur.
    """
    try:
        # Temizlik: Mekan isminde gereksiz karakterleri temizle
        clean_name = venue_name.strip()
        
        # 1. Deneme: Direkt Mekan İsmi (Türkiye içinde)
        # country_codes='tr' -> Sadece Türkiye sonuçlarını getirir
        location = geolocator.geocode(clean_name, country_codes='tr', timeout=5)
        
        if location: 
            return location.latitude, location.longitude

        # 2. Deneme: Eğer bulunamazsa, yaygın kelimeleri çıkarıp dene
        # Örn: "Dorock XL Kadıköy Sahne" -> "Dorock XL Kadıköy"
        short_name = clean_name.replace("Sahne", "").replace("Performance Hall", "").replace("Event Hall", "").strip()
        if short_name != clean_name:
            location = geolocator.geocode(short_name, country_codes='tr', timeout=5)
            if location: return location.latitude, location.longitude

        print(f"⚠️ Konum bulunamadı: {venue_name} -> Varsayılan (İst) atandı.")
        return 41.0082, 28.9784 
    except:
        return 41.0082, 28.9784

def extract_price(text):
    """Fiyatı bulur: TL, ₺ veya sadece sayı"""
    clean_text = text.replace("\n", " ").strip()
    
    # ₺ veya TL içeren fiyatı bul
    price_match = re.search(r'(\d{2,4})\s*(TL|₺)', clean_text, re.IGNORECASE)
    if price_match:
        return f"{price_match.group(1)} TL"
    
    # Eğer sembol yoksa, metnin sonundaki 3-4 haneli sayıyı fiyat varsay
    numbers = re.findall(r'\b\d{3,4}\b', clean_text)
    if numbers:
        return f"{numbers[-1]} TL"

    return "Biletix/Bubilet" # Fiyat bulunamazsa

def extract_datetime(text):
    """Metin içindeki tarih ve saati bulur"""
    current_year = datetime.datetime.now().year
    
    # Varsayılan: Yarın 21:00
    dt = datetime.datetime.now() + datetime.timedelta(days=1)
    dt = dt.replace(hour=21, minute=0, second=0)

    # Saat Bul (21:00 veya 21.00)
    time_match = re.search(r'(\d{1,2})[:.](\d{2})', text)
    hour = int(time_match.group(1)) if time_match else 21
    minute = int(time_match.group(2)) if time_match else 0

    # Ay ve Gün Bul
    months = {"Ocak": 1, "Şubat": 2, "Mart": 3, "Nisan": 4, "Mayıs": 5, "Haziran": 6, "Temmuz": 7, "Ağustos": 8, "Eylül": 9, "Ekim": 10, "Kasım": 11, "Aralık": 12}
    
    found_month = dt.month
    found_day = dt.day
    
    for m_name, m_num in months.items():
        if m_name in text or m_name.lower() in text.lower():
            found_month = m_num
            # Gün bul (Ay isminin yanındaki veya öncesindeki sayı)
            day_search = re.search(fr'(\d{{1,2}})\s+{m_name}', text, re.IGNORECASE)
            if not day_search:
                day_search = re.search(fr'{m_name}\s+(\d{{1,2}})', text, re.IGNORECASE)
            
            if day_search:
                found_day = int(day_search.group(1))
            break
    
    # Yıl Tahmini
    year = current_year
    if found_month < datetime.datetime.now().month:
        year += 1
        
    try:
        return datetime.datetime(year, found_month, found_day, hour, minute).isoformat()
    except:
        return dt.isoformat()

# --- ANA BOT ---

def scrape_events():
    print("🤖 Bot Başlatılıyor...")
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        # HEDEF URL (Bubilet Genel Müzik Sayfası - Şehir ayrımı olmadan)
        # Veya spesifik şehir: https://www.bubilet.com.tr/istanbul
        url = "https://www.bubilet.com.tr/istanbul/etiket/konser" 
        driver.get(url)
        print("🌐 Siteye gidildi...")
        
        time.sleep(5) # Yüklenmesini bekle

        # Kartları Bul (.relative genel bir kapsayıcıdır, içinde filtreleme yapacağız)
        potential_cards = driver.find_elements(By.CSS_SELECTOR, ".relative") 
        
        print(f"🔍 {len(potential_cards)} potansiyel alan taraniyor...")

        count = 0
        for card in potential_cards:
            try:
                text = card.text
                # Çok kısa metinleri atla (reklam vs olabilir)
                if not text or len(text) < 15: continue 

                # Link ve Resim Kontrolü
                try:
                    link_elem = card.find_element(By.TAG_NAME, "a")
                    ticket_url = link_elem.get_attribute("href")
                    if "etkinlik" not in ticket_url and "bilet" not in ticket_url: continue
                except: continue

                try:
                    img_elem = card.find_element(By.TAG_NAME, "img")
                    image_url = img_elem.get_attribute("src")
                except: image_url = ""

                # --- VERİ AYRIŞTIRMA ---
                lines = [l.strip() for l in text.split('\n') if l.strip()]
                
                # Mantık: 
                # 1. Satır genelde Başlık
                # 2. Satır genelde Mekan
                # Ancak tarih en üstte de olabilir.
                
                title = lines[0]
                venue = "Bilinmiyor"
                
                # Mekan ismini tespit etmeye çalış
                # İçinde "Sahne", "Merkezi", "Hall", "Club", "Park" geçen satırı mekan yap
                for line in lines:
                    if any(x in line for x in ["Sahne", "Merkezi", "Hall", "Club", "Park", "Pub", "Jolly", "IF", "Dorock", "Vadi", "Arena", "Tiyatro"]):
                        venue = line
                        break
                
                # Eğer mekan bulamazsa ve 2. satır varsa, onu mekan varsay
                if venue == "Bilinmiyor" and len(lines) > 1:
                    venue = lines[1]

                iso_date = extract_datetime(text)
                price = extract_price(text)
                
                # --- KONUM BULMA (Düzeltilen Kısım) ---
                lat, lng = get_coordinates_turkey_smart(venue)

                # Veritabanına Yaz
                data = {
                    "title": title,
                    "venue_name": venue,
                    "category": "Müzik", 
                    "price": price,
                    "start_time": iso_date,
                    "ticket_url": ticket_url,
                    "image_url": image_url,
                    "description": f"{venue} mekanında gerçekleşecek.",
                    "lat": lat,
                    "lng": lng,
                    "is_approved": False,
                    "address": venue, # Açık adres yerine mekan ismini koyuyoruz şimdilik
                    "sold_out": False
                }

                supabase.table("events").insert(data).execute()
                print(f"✅ Eklendi: {title} | 📍 {venue} ({lat}, {lng})")
                count += 1
                time.sleep(0.2)

            except Exception:
                continue

        print(f"🎉 Toplam {count} etkinlik başarıyla çekildi!")

    except Exception as e:
        print(f"Genel Hata: {e}")
    
    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_events()