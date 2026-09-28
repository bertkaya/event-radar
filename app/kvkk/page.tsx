import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni ve Gizlilik | 18-23',
  description: '18-23 kişisel verilerin korunması aydınlatma metni, çerez ve gizlilik politikası.',
}

// ⚠️ Köşeli parantezli alanları doldurun ve yayına almadan önce bir hukukçuya kontrol ettirin.
const CONTROLLER = {
  name: '[VERİ SORUMLUSU AD SOYAD / ŞİRKET UNVANI]',
  address: '[ADRES]',
  email: 'iletisim@18-23.com',
}
const LAST_UPDATED = '28 Eylül 2026'

export default function KvkkPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 text-sm leading-relaxed">
        <Link href="/" className="text-brand font-bold">← 18-23</Link>
        <header>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">KVKK Aydınlatma Metni ve Gizlilik Politikası</h1>
          <p className="text-gray-500 mt-1">Son güncelleme: {LAST_UPDATED}</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla
            {' '}<strong>{CONTROLLER.name}</strong> ({CONTROLLER.address}) tarafından aşağıda açıklanan kapsamda işlenmektedir.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. İşlenen Kişisel Veriler ve Amaçları</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Hesap bilgileri</strong> (e-posta, kullanıcı adı, şifrenin şifrelenmiş hali): üyelik oluşturma, giriş ve hesap güvenliği.</li>
            <li><strong>Tercih ve etkileşim verileri</strong> (ilgi alanları, favoriler, takip edilen mekânlar, yorumlar, müzik profili): kişiselleştirilmiş etkinlik önerisi ve bildirim.</li>
            <li><strong>Mekân başvuru formu</strong> (mekân adı, yetkili adı, telefon, e-posta, mesaj): başvurunun değerlendirilmesi ve sizinle iletişim.</li>
            <li><strong>Etkinlik önerisi formu</strong> (isteğe bağlı e-posta): öneriniz hakkında dönüş.</li>
            <li><strong>Kullanım istatistikleri</strong> (hangi etkinliğin paylaşıldığı/favorilendiği; kişiyle eşleştirilmeden): hizmetin iyileştirilmesi.</li>
            <li><strong>Konum</strong>: yalnızca &quot;Konumumu Bul&quot; özelliğini kullandığınızda, tarayıcınızda yakın etkinlikleri göstermek için kullanılır; sunucularımıza kaydedilmez.</li>
            <li><strong>IP adresi</strong>: kötüye kullanım ve spam önleme amacıyla geçici olarak işlenir.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">3. Hukuki Sebepler</h2>
          <p>
            Verileriniz KVKK m.5/2 uyarınca; üyelik sözleşmesinin kurulması ve ifası (c), veri sorumlusunun meşru menfaati (f) ve
            hukuki yükümlülüklerin yerine getirilmesi (ç) sebeplerine; mekân başvurusu ve pazarlama amaçlı iletişim bakımından ise
            açık rızanıza (m.5/1) dayanılarak işlenmektedir.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">4. Aktarım ve Yurt Dışı Aktarım</h2>
          <p>
            Hizmetin sunulması için altyapı sağlayıcılarımızdan yararlanıyoruz: veritabanı ve kimlik doğrulama için <strong>Supabase</strong>,
            barındırma için <strong>Vercel</strong>. Bu sağlayıcıların sunucuları yurt dışında bulunabileceğinden verileriniz KVKK m.9
            kapsamında yurt dışına aktarılabilir. [AKTARIM DAYANAĞINI BELİRTİN: standart sözleşme / açık rıza]. Verileriniz bunun dışında
            üçüncü kişilere satılmaz veya pazarlama amacıyla paylaşılmaz. Bilet satın alma işlemleri ilgili bilet sitesinde gerçekleşir;
            18-23 ödeme bilgisi toplamaz.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">5. Saklama Süresi</h2>
          <p>
            Hesap verileri hesabınız açık kaldığı sürece saklanır. Profil sayfasındaki <strong>&quot;Hesabımı Sil&quot;</strong> ile hesabınızı ve
            ilişkili kişisel verilerinizi (favoriler, takipler, yorumlar, bildirimler) kalıcı olarak silebilirsiniz. Mekân başvuruları
            değerlendirmeden itibaren [SÜRE] süreyle saklanır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">6. Çerezler ve Yerel Depolama</h2>
          <p>
            18-23 reklam veya üçüncü taraf takip çerezi kullanmaz. Yalnızca oturumunuzu açık tutmak için zorunlu yerel depolama
            (Supabase oturum anahtarı) ve yönetici paneli için zorunlu oturum çerezi kullanılır. Harita katmanları OpenStreetMap
            sunucularından yüklenir.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">7. Haklarınız (KVKK m.11)</h2>
          <p>
            Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme,
            aktarıldığı kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme, itiraz etme ve
            zararın giderilmesini talep etme haklarına sahipsiniz. Taleplerinizi <a className="text-brand underline" href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>
            {' '}adresine iletebilirsiniz; talepler en geç 30 gün içinde yanıtlanır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">8. Etkinlik Bilgileri Hakkında</h2>
          <p>
            Etkinlik bilgileri kamuya açık bilet satış sayfalarından derlenir ve ilgili satış sayfasına yönlendirilir. Bilgilerin
            doğruluğu için lütfen satış sayfasını kontrol edin. Bir etkinliğin kaldırılmasını talep etmek için bize yazabilirsiniz.
          </p>
        </section>
      </div>
    </main>
  )
}
