// Shared articles data for gelismeler.html and hakkinda.html
const articlesData = [
  {
    id: 2,
    category: "deneme",
    badge: "Deneme",
    badgeEn: "Essay",
    badgeClass: "badge-deneme",
    image: "assets/images/deeptech.jpeg",
    date: "26 OCA 2026",
    dateEn: "JAN 26, 2026",
    readTime: "8 DK. OKUMA SÜRESİ",
    readTimeEn: "8 MIN READ",
    title: "Yapay Zeka Hakkında En Sevdiğim Kitaplar",
    titleEn: "My Favorite Books About AI",
    excerpt: "Yapay zekayı hem mühendislik hem de toplumsal yönleriyle anlamama katkı sağlayan 15 kitap. Kısa, net ve kişisel notlarla derlediğim bir okuma listesi.",
    excerptEn: "A reading list of 15 books that helped me understand AI from both engineering and societal perspectives. Short, clear, and personal notes.",
    link: "yazi-kitaplar.html"
  },
  {
    id: 1,
    category: "newsroom",
    badge: "Newsroom",
    badgeEn: "Newsroom",
    badgeClass: "",
    image: "assets/images/podcast.jpeg",
    date: "15 OCA 2025",
    dateEn: "JAN 15, 2025",
    readTime: "2 DK. OKUMA SÜRESİ",
    readTimeEn: "2 MIN READ",
    title: "PowerFM Podcast Ödülleri - En İyi Bilim-Teknoloji Podcasti Adayı",
    titleEn: "PowerFM Podcast Awards - Nominee for Best Science & Technology Podcast",
    excerpt: "Otostopçunun Yapay Zeka Rehberi, PowerFM Podcast Ödülleri'nde En İyi Bilim-Teknoloji Podcasti kategorisinde aday gösterildi. Yapay zeka ve teknoloji alanında Türkiye'nin en kapsamlı podcast içeriğiyle ödüle layık görüldük.",
    excerptEn: "Hitchhiker's Guide to AI was nominated in the Best Science & Technology Podcast category at the PowerFM Podcast Awards. We were recognized for the most comprehensive AI & tech podcast content in Turkey.",
    link: "haber-powerfm.html",
    newsroomDate: "OCAK 2025"
    ,
    newsroomDateEn: "JANUARY 2025"
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
