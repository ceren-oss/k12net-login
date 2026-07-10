# Changelog
Bu projedeki önemli değişiklikler bu dosyada tutulur.

## [2026-07-09] - Bayi Portalı Feature Tamamlama ve Prod Stabilizasyonu
### Added
- Admin panelinde ürün içeriklerinin düzenlenebilmesi (`Ürünler` ekranı).
- `Çekler` ekranında çek silme akışı.
- Muhasebe rolü için admin hesabı oluşturma ve rol bazlı menü kısıtları (Dashboard/Ödemeler/Çekler).
- Ön siparişte “Ön Görülen Sınıf Dağılımı” girişi ve siparişle birlikte kaydedilmesi.
- Okul formunda sınıf bazlı paket seçimi desteği (8’li ve 4’lü paketlerin aynı siparişte farklı sınıflara atanabilmesi).
- Miniskop Merkez bayisi için esnek birim fiyat girişi.
- Bayi ekranında sipariş/ön sipariş detayında kargo bedeli ve kargo dahil toplam gösterimi.

### Changed
- Dashboard’dan “Son Admin İşlemleri” görünümünün kaldırılması.
- Kılavuz modal davranışı: kullanıcı kapattıktan sonra sayfa yenilemelerinde otomatik açılmama.
- Okul formu tekrar gönderim durumunda form statüsünün `okul_formu_guncelledi` olarak güncellenmesi.
- Ön sipariş detay hesaplamalarının yardımcı fonksiyonlarla merkezileştirilmesi.

### Fixed
- Bayi ön sipariş detayında runtime crash: `ReferenceError: getPreOrderSubtotal is not defined`.
- Form/rapor indirme akışında bozuk çıktı üreten senaryoların düzeltilmesi.
- Okul formunda sınıf toplam adedinin sipariş adedinden az olmasını engelleyen doğrulama.

### Validation
- Authenticated production smoke/E2E testleri tamamlandı.
- Kritik akış doğrulaması: **11/11 adım başarılı**, **11/11 bulgu başarılı**.
- Test sırasında uncaught runtime page error tespit edilmedi.

### Deployment
- Değişiklikler `main` branch’e alındı ve production ortama deploy edildi.
- Production alias sağlık kontrolü: `https://bayi.kesifkutusu.com.tr` erişilebilir (`200`).

### Security / Operations
- Oturum sırasında kullanılan açığa çıkmış GitHub PAT için revoke işlemi tetiklendi ve yeni token rotasyonu tamamlandı.
