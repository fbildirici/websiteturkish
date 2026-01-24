// Shared articles data for yazilar.html and hakkinda.html
const articlesData = [
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
