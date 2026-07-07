// Shared articles data for gelismeler.html and hakkinda.html
const articlesData = [
  {
    id: 5,
    category: "newsroom",
    badge: "Haberler",
    badgeEn: "Newsroom",
    badgeClass: "",
    image: "assets/images/events/noms.jpeg",
    date: "Tem 2026",
    dateEn: "Jul 2026",
    readTime: "Sunum",
    readTimeEn: "Presentation",
    title: "Toward Resilient System-Level Explainable AI in Defense System-of-Systems: Gap-Aware Confidence Recalibration",
    titleEn: "Toward Resilient System-Level Explainable AI in Defense System-of-Systems: Gap-Aware Confidence Recalibration",
    excerpt: "Fatih Bildirici, PhDc; Keziban Seçkin Codal; Özge Batur ile birlikte yürüttüğümüz Toward Resilient System-Level Explainable AI in Defense System-of-Systems: Gap-Aware Confidence Recalibration başlıklı çalışmayı sundum.",
    excerptEn: "I presented the work 'Toward Resilient System-Level Explainable AI in Defense System-of-Systems: Gap-Aware Confidence Recalibration' together with Fatih Bildirici, PhDc; Keziban Seçkin Codal; and Özge Batur.",
    link: "haber-resilient-xai.html",
    newsroomDate: "Temmuz 2026",
    newsroomDateEn: "July 2026"
  },
  {
    id: 4,
    category: "newsroom",
    badge: "Haberler",
    badgeEn: "Newsroom",
    badgeClass: "",
    image: "assets/images/ssakariyer.jpeg",
    date: "Mart 2026",
    dateEn: "Mar 2026",
    readTime: "Video",
    readTimeEn: "Video",
    title: "5. Nesil Mühendislik: Yapay Zeka ile Sınırları Aşmak — SSA Kariyer ve Yetkinlik Buluşmaları",
    titleEn: "5th Generation Engineering: Pushing Boundaries with AI — SSA Career & Competency Meetings",
    excerpt: "Milli Yetkinlik Hamlesi kapsamında üniversite öğrencilerine yönelik düzenlenen SSA Kariyer ve Yetkinlik Buluşmaları-3'te \"5. Nesil Mühendislik: Yapay Zeka ile Sınırları Aşmak\" başlıklı sunumla yer aldım.",
    excerptEn: "I participated in SSA Career & Competency Meetings-3, organized for university students under the National Competency Initiative, with a talk titled '5th Generation Engineering: Pushing Boundaries with AI'.",
    link: "haber-ssakariyer.html",
    newsroomDate: "Mart 2026",
    newsroomDateEn: "March 2026"
  },
  {
    id: 3,
    category: "newsroom",
    badge: "Haberler",
    badgeEn: "Newsroom",
    badgeClass: "",
    image: "https://img.youtube.com/vi/bQeOfERu1Fo/hqdefault.jpg",
    date: "Şub 2026",
    dateEn: "Feb 2026",
    readTime: "Video",
    readTimeEn: "Video",
    title: "Fatih Bildirici - Neden Yapay Zekayı Tam Olarak Anlamıyoruz?",
    titleEn: "Why Don't We Fully Understand Artificial Intelligence?",
    excerpt: "EN-X sahnesinde yaptığım bu konuşmada, yapay zekayı neden tam olarak anlayamadığımızı, açıklanabilirlik yaklaşımlarını ve gerçek dünyadaki kararlarımıza etkisini kendi bakış açımla anlatıyorum.",
    excerptEn: "In this EN-X stage talk, I share my perspective on why we don't fully understand AI, how explainability helps, and what it means for real-world decisions.",
    link: "haber-enx.html",
    newsroomDate: "Şubat 2026",
    newsroomDateEn: "February 2026"
  },
  {
    id: 2,
    category: "deneme",
    badge: "Deneme",
    badgeEn: "Essay",
    badgeClass: "badge-deneme",
    image: "assets/images/deeptech.jpeg",
    date: "26 Ocak 2026",
    dateEn: "Jan 26, 2026",
    readTime: "8 dk. okuma süresi",
    readTimeEn: "8 min read",
    title: "Yapay Zeka Hakkında En Sevdiğim Kitaplar",
    titleEn: "My Favorite Books About AI",
    excerpt: "Yapay zekayı hem mühendislik hem de toplumsal yönleriyle anlamama katkı sağlayan 15 kitap. Kısa, net ve kişisel notlarla derlediğim bir okuma listesi.",
    excerptEn: "A reading list of 15 books that helped me understand AI from both engineering and societal perspectives. Short, clear, and personal notes.",
    link: "yazi-kitaplar.html"
  },
  {
    id: 1,
    category: "newsroom",
    badge: "Haberler",
    badgeEn: "Newsroom",
    badgeClass: "",
    image: "assets/images/podcast.jpeg",
    date: "15 Ocak 2025",
    dateEn: "Jan 15, 2025",
    readTime: "2 dk. okuma süresi",
    readTimeEn: "2 min read",
    title: "PowerFM Podcast Ödülleri - En İyi Bilim-Teknoloji Podcasti Adayı",
    titleEn: "PowerFM Podcast Awards - Nominee for Best Science & Technology Podcast",
    excerpt: "Otostopçunun Yapay Zeka Rehberi, PowerFM Podcast Ödülleri'nde En İyi Bilim-Teknoloji Podcasti kategorisinde aday gösterildi. Yapay zeka ve teknoloji alanında Türkiye'nin en kapsamlı podcast içeriğiyle ödüle layık görüldük.",
    excerptEn: "Hitchhiker's Guide to AI was nominated in the Best Science & Technology Podcast category at the PowerFM Podcast Awards. We were recognized for the most comprehensive AI & tech podcast content in Turkey.",
    link: "haber-powerfm.html",
    newsroomDate: "Ocak 2025",
    newsroomDateEn: "January 2025"
  }
];

// Helper function to get articles by category
function getArticlesByCategory(category) {
  if (category === 'all') {
    return articlesData;
  }
  return articlesData.filter(article => article.category === category);
}

// Helper function to get newsroom articles
function getNewsroomArticles() {
  return articlesData.filter(article => article.category === 'newsroom');
}
