// Shared articles data for yazilar.html and hakkinda.html
const articlesData = [
  {
    id: 1,
    category: "newsroom",
    badge: "Newsroom",
    badgeClass: "",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
    date: "05 ARA 2025",
    readTime: "1 DK. OKUMA SÜRESİ",
    title: "Responsible AI Institute Research Fellow Oldum",
    excerpt: "Sorumlu yapay zeka geliştirme alanında araştırma bursu aldım. Şeffaflık ve etik AI sistemleri üzerine çalışmalar yapacağım.",
    link: "yazi-1.html",
    newsroomDate: "ARALIK 2024"
  },
  {
    id: 2,
    category: "deneme",
    badge: "Deneme",
    badgeClass: "badge-deneme",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=300&fit=crop",
    date: "12 KAS 2025",
    readTime: "5 DK. OKUMA SÜRESİ",
    title: "Yapay Zeka ve İnsan Bilinci Üzerine",
    excerpt: "Bilişsel bilimler ve yapay zeka kesişiminde en derin sorulardan biri: Makineler bilinçli olabilir mi?",
    link: "yazi-2.html",
    newsroomDate: "KASIM 2025"
  },
  {
    id: 3,
    category: "makale",
    badge: "Makale",
    badgeClass: "badge-makale",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop",
    date: "28 EKİ 2025",
    readTime: "8 DK. OKUMA SÜRESİ",
    title: "Açıklanabilir Yapay Zeka: Kara Kutuyu Aydınlatmak",
    excerpt: "Yapay zeka sistemleri hayatımızın kritik alanlarında karar verirken, bu kararların \"neden\" verildiğini anlamak artık bir zorunluluk.",
    link: "yazi-3.html",
    newsroomDate: "EKİM 2025"
  },
  {
    id: 4,
    category: "newsroom",
    badge: "Newsroom",
    badgeClass: "",
    image: "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=400&h=250&fit=crop",
    date: "15 KAS 2024",
    readTime: "2 DK. OKUMA SÜRESİ",
    title: "AICon 0.2 - Açıklanabilir Yapay Zeka Konuşması",
    excerpt: "Ankara Üniversitesi YazGit'te \"Demystifying Machine Intelligence: The Path to Explainable AI\" başlıklı keynote konuşma yaptım.",
    link: "#",
    newsroomDate: "KASIM 2024"
  },
  {
    id: 5,
    category: "newsroom",
    badge: "Newsroom",
    badgeClass: "",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=250&fit=crop",
    date: "20 OCA 2024",
    readTime: "2 DK. OKUMA SÜRESİ",
    title: "Otostopçunun Yapay Zeka Rehberi - Türkiye'nin #1 AI Podcasti",
    excerpt: "Douglas Adams'ın eserine ilham alan podcast, Türkiye'nin en çok dinlenen yapay zeka podcasti oldu.",
    link: "#",
    newsroomDate: "OCAK 2024"
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
