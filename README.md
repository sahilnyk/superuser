# Free Minimal Astro Portfolio

A modern, minimalist portfolio website built with Astro and deployed on Cloudflare Pages. Features a collection of writings, projects, and professional experiences.

![alt text](image.png)

## Overview

This is a personal portfolio website for sahilnyk, a Software Engineer and Curious Tinkerer. The site showcases blog posts, technical notes, project work, and professional experience in a clean, fast-loading format.



## Features

- 🚀 Built with [Astro](https://astro.build) v5.1
- ⚡️ Deployed on [Cloudflare Pages](https://pages.cloudflare.com)
- 📝 Content sections:
  - Blog posts
  - Technical notes
  - Project showcase
  - Professional experience
  - Curated bookmarks
  - Hire Me page with cal.com integration
- 🎨 Clean typography with:
  - Inter
  - Roboto Mono
  - Source Sans Pro
- 🌐 Social presence integration
- 📱 Fully responsive design

## Tech Stack

- **Framework**: [Astro](https://astro.build) 5.1.2
- **Deployment**: Cloudflare Pages
- **Fonts**: 
  - @fontsource/inter
  - @fontsource/roboto-mono
  - @fontsource/source-sans-pro

## Publish from a browser

This repository is configured for [Pages CMS](https://pagescms.org/) through [`.pages.yml`](.pages.yml). It provides an editor for blog posts plus image uploads to `public/images`.

1. Push this repository to GitHub and make sure Cloudflare Pages builds from that repository's branch.
2. Open [app.pagescms.org](https://app.pagescms.org/), sign in with GitHub, and install the Pages CMS GitHub App for this repository.
3. Select the repository and the branch Cloudflare Pages deploys. Create or edit content and save it. Pages CMS commits the Markdown to GitHub; Cloudflare Pages then rebuilds the site.

New blog posts start as drafts. Turn **Draft** off and save to publish. Drafts can appear on the local development site, but are excluded from production pages. The Markdown filename becomes the URL slug, so choose the filename carefully when creating an entry. Uploaded images use `/images/...` paths in Markdown.

The editor is hosted by Pages CMS and uses GitHub sign-in; there is no public admin route or password stored in this site.

## Development

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or pnpm

### Local Development

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `pnpm dev` to start the development server
4. Open your browser and navigate to `http://localhost:4321` to view the site

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Astro](https://astro.build)
- [Fontsource](https://fontsource.org)
- [Tailwind CSS](https://tailwindcss.com)
