import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
import datetime
import time

# --- 1. AYARLAR ---
# .env.local dosyanızdaki bilgileri buraya tırnak içine yapıştırın
SUPABASE_URL = "https://ugvwxzehwpfszvvzoyim.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndnd4emVod3Bmc3p2dnpveWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Njk0NTYsImV4cCI6MjA3OTE0NTQ1Nn0._9BKiHzXZVWmXTZdFc2Fllb9qVlpS1fPVpVeUh87O-c"

# Supabase Bağlantısı
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def scrape_bubilet_istanbul():
    print("Bot çalışıyor: Bubilet İstanbul Müzik taranıyor...")
    
    # Hedef URL (İstanbul Müzik Etkinlikleri)
    url = "https://www.bubilet.com.tr/istanbul/etkinlik/kayhan-kalhor-erdal-erzincan"
    
    # Tarayıcı gibi görünmek için başlık (User-Agent) şarttır
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Hata: Siteye erişilemedi. Kod: {response.status_code}")
            return

        soup = BeautifulSoup(response.content, "html.parser")
        
        # Etkinlik kartlarını bul (Bubilet'in yapısına göre class isimleri)
        # DİKKAT: Siteler tasarım değiştirirse bu class isimlerini güncellemek gerekir.
        events = soup.find_all("div", class_="etkinlik-karti") 

        count = 0
        for event in events:
            try:
                # Verileri Ayıkla
                title = event.find("h3", class_="etkinlik-adi").text.strip()
                venue = event.find("span", class_="mekan-adi").text.strip()
                
                # Tarih verisi genelde karışıktır, şimdilik yarını atıyoruz
                # Gerçek senaryoda tarihi metinden ayrıştırmak (Parsing) gerekir
                date_obj = datetime.datetime.now() + datetime.timedelta(days=1)
                iso_date = date_obj.isoformat()

                # Link ve Resim
                link_tag = event.find("a", href=True)
                ticket_url = "https://www.bubilet.com.tr" + link_tag['href']
                
                img_tag = event.find("img")
                image_url = img_tag['data-src'] if 'data-src' in img_tag.attrs else img_tag['src']

                # Fiyat (Bazen yazmaz)
                price_tag = event.find("span", class_="fiyat")
                price = price_tag.text.strip() if price_tag else "Belirsiz"

                # --- VERİTABANINA KAYDET ---
                data = {
                    "title": title,
                    "venue_name": venue,
                    "category": "Müzik",
                    "price": price,
                    "start_time": iso_date,
                    "ticket_url": ticket_url,
                    "image_url": image_url,
                    "description": "Bubilet üzerinden otomatik çekildi.",
                    "lat": 41.0082, # Varsayılan İstanbul konumu (Sonra admin panelinden düzeltilir)
                    "lng": 28.9784,
                    "is_approved": False, # DİKKAT: Taslak olarak ekliyoruz, Admin onaylayacak
                    "address": "İstanbul"
                }

                # Veritabanına ekle
                supabase.table("events").insert(data).execute()
                print(f"✅ Eklendi: {title}")
                count += 1
                
                # IP Ban yememek için biraz bekle
                time.sleep(0.5)

            except Exception as e:
                print(f"Bir etkinlik atlandı: {e}")
                continue

        print(f"--- İşlem Tamamlandı. Toplam {count} etkinlik taslağa eklendi. ---")

    except Exception as e:
        print(f"Genel Hata: {e}")

if __name__ == "__main__":
    scrape_bubilet_istanbul()