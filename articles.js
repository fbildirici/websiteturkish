// Shared articles data for gelismeler.html and hakkinda.html
const articlesData = [
  {
    id: 2,
    category: "deneme",
    badge: "Deneme",
    badgeClass: "badge-deneme",
    image: "assets/images/deeptech.jpeg",
    date: "26 OCA 2026",
    readTime: "8 DK. OKUMA SÜRESİ",
    title: "Yapay Zeka Hakkında En Sevdiğim Kitaplar",
    excerpt: "Yapay zekayı hem mühendislik hem de toplumsal yönleriyle anlamama katkı sağlayan 15 kitap. Kısa, net ve kişisel notlarla derlediğim bir okuma listesi.",
    link: "yazi-kitaplar.html"
  },
  {
    id: 1,
    category: "newsroom",
    badge: "Newsroom",
    badgeClass: "",
    image: "assets/images/podcast.jpeg",
    date: "15 OCA 2025",
    readTime: "2 DK. OKUMA SÜRESİ",
    title: "PowerFM Podcast Ödülleri - En İyi Bilim-Teknoloji Podcasti Adayı",
    excerpt: "Otostopçunun Yapay Zeka Rehberi, PowerFM Podcast Ödülleri'nde En İyi Bilim-Teknoloji Podcasti kategorisinde aday gösterildi. Yapay zeka ve teknoloji alanında Türkiye'nin en kapsamlı podcast içeriğiyle ödüle layık görüldük.",
    link: "haber-powerfm.html",
    newsroomDate: "OCAK 2025"
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
