# 🍿 TV & Cinema Tracker

Uma aplicação mobile (Android/PWA) de alto desempenho para acompanhamento de filmes e séries, construída com **Next.js**, **Capacitor** e **TMDB API**. Focada em estética premium, animações fluidas a 120Hz e experiência de utilizador simplificada.

## ✨ Funcionalidades Principais

- **🚀 Performance Extrema**: Animações otimizadas com `Framer Motion` para uma fluidez de 120Hz nativa.
- **📅 Calendário de Estreias**: Visualiza as próximas estreias das séries na tua watchlist de forma organizada por meses.
- **🛡️ Watchlist Inteligente**: Gestão avançada que oculta séries que ainda não estrearam, mantendo o teu foco no que podes ver agora.
- **🔍 Descoberta por Género**: Sistema de popups com carregamento ultra-rápido (cache incremental) para navegar por categorias.
- **🎲 Sorteio Aleatório**: Não sabes o que ver? Usa o sistema de dados para escolher algo aleatório da tua watchlist.
- **📱 Integração Nativa Android**:
  - Suporte para **Themed Icons (Material You)**.
  - Barra de estado (Status Bar) adaptada para modo escuro.
  - Feedback tátil (Haptics) integrado em menus e botões.
  - Navegação fluida com suporte para o botão "Back" nativo.
- **🌗 Design Premium**: Interface Dark Mode com glassmorphism, skeletons de carregamento e tipografia moderna.

## 🛠️ Stack Tecnológica

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animações**: [Framer Motion](https://www.framer.com/motion/)
- **Mobile**: [Capacitor](https://capacitorjs.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **API**: [TMDB (The Movie Database)](https://www.themoviedb.org/)
- **Persistência**: LocalStorage com sistema de cache de 12h para chamadas de API.

## 🚀 Como Começar (Desenvolvimento)

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/o-teu-utilizador/tv-cinema.git
   cd tv-cinema
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Executar em Desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Compilar para Android**:
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

## 📄 Notas de Versão (v1.0.0)
- Ícone oficial de pipocas configurado com camada monocromática para temas dinâmicos do Android.
- Sistema de cache inteligente para carregamento instantâneo de listas populares e géneros.
- Correção de bugs de visibilidade na barra de estado e navegação gestual.

---
Desenvolvido com ❤️ por [Sandro Garcia]
