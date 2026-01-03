# 🍿 TV & Cinema Tracker

Uma aplicação mobile de alto desempenho desenvolvida com **Next.js**, **Capacitor** e **TMDB API**, focada em oferecer uma experiência premium para acompanhamento de filmes e séries.

![Versão](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor)

## ✨ Funcionalidades

### 🚀 Performance & UX
- **Fluidez Nativa**: Animações otimizadas a 120Hz com `Framer Motion`.
- **Experiência Premium**: Interface Dark Mode com Glassmorphism e micro-interações.
- **Feedback Tátil**: Integração com Haptics nativo do Android em ações críticas.
- **Skeleton Loading**: Carregamento visual progressivo para evitar flashes de conteúdo vazio.

### 📅 Gestão de Conteúdo
- **Watchlist Inteligente**: Filtra automaticamente séries que ainda não estrearam, mantendo o foco no que está disponível.
- **Calendário de Estreia**: Visualização organizada por meses de todas as próximas estreias da sua lista.
- **Sorteio Aleatório**: Sistema de "dados" para ajudar a decidir o que ver a seguir.
- **Histórico Completo**: Acompanhamento detalhado de episódios e filmes vistos.

### 🛠️ Integrações & Tecnologia
- **TMDB API**: Integração completa para metadados, posters e informações de elenco.
- **Cache Incremental**: Sistema de persistência local (12h) para reduzir chamadas de API e acelerar o carregamento.
- **Android Native**: Suporte a *Themed Icons* (Material You) e barra de estado adaptativa.

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 15 (App Router) + React 19
- **Estilização**: Tailwind CSS + Custom Design System
- **Animações**: Framer Motion
- **Mobile Foundation**: Capacitor 8
- **Base de Dados**: TMDB API + Local Storage
- **Gráficos**: Recharts

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Android Studio (para builds mobile)

### Instalação
1. Clone o repositório:
```bash
git clone https://github.com/[SEU-UTILIZADOR]/tv-cinema-tracker.git
cd tv-cinema-tracker
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` e adicione sua chave da TMDB:
```env
NEXT_PUBLIC_TMDB_API_KEY=sua_chave_aqui
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

### Build Mobile (Android)
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 📁 Estrutura do Projeto

```text
src/
├── app/          # Rotas e páginas (Next.js App Router)
├── components/   # Componentes UI reutilizáveis
├── hooks/        # Hooks customizados (Tracking, Cache, etc)
├── lib/          # Utilitários e instâncias de API
└── assets/       # Imagens e recursos estáticos
```

## 🤝 Contribuição

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Faça o Commit das suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça o Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra un Pull Request

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---
Desenvolvido por **Sandro Garcia**
