# Masabaşı Oyun Kulübü

The existing Turkish club website, redesigned around a centered editorial layout. The original logo, photographs, local fonts, cream/charcoal/brown palette, content, and sections are preserved. This remains buildless HTML/CSS/JavaScript with no dependencies or installation step.

Run from this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open [the local preview](http://localhost:8765/?v=20261015).

- `index.html`: semantic page content, accessible navigation, and original imagery.
- `styles.css`: shared 1312px container, typography and spacing tokens, responsive layouts, and hover interactions.
- `scripts.js`: mobile navigation, destination configuration, and entrance/scroll animations.
- `assets/`: preserved club assets and licensed local fonts; see `assets/ASSETS.md`.
- `validation/`: repeatable Playwright MCP checks, results, and screenshots. The current screenshots use the `redesign-final-` prefix; earlier screenshots are historical.

The desktop hero uses a 43:57 column split. Below 900px, the hero, About, and Membership sections stack; benefits become two columns and events become two columns. Below 600px, benefits and events become single columns. Responsive gutters keep content inset at every size.

Motion uses Web Animations and IntersectionObserver with a 110ms hero stagger, 500–610ms durations, and individual, once-only scroll reveals. Content and navigation remain visible without JavaScript. Reduced motion disables entrances and smooth scrolling, including when the preference changes during an animation.

Set the five values in `CLUB_LINKS` in `scripts.js` when the real Instagram profile, Discord invite, and three registration URLs are available. The existing local destinations and Turkish pending-link announcements remain in use. Event dates, times, and locations remain “Belirlenecek.”

See `validation/REPORT.md` and `validation/results.json` for the current browser verification.

## GitHub Pages ile ücretsiz yayın

Repo: [enginc4n/masabasi-website](https://github.com/enginc4n/masabasi-website)

Site adresi: [enginc4n.github.io/masabasi-website](https://enginc4n.github.io/masabasi-website/)

`.github/workflows/deploy-pages.yml`, `main` dalına her push işleminde siteyi GitHub Pages'e yayınlar. Akış yalnızca `index.html`, `styles.css`, `scripts.js`, `.nojekyll` ve `assets/` klasörünü paketler. Yerel tarayıcı çıktıları, doğrulama ekran görüntüleri ve geliştirme dosyaları yayın paketine dahil edilmez.

Sonraki güncellemeleri yayınlamak için:

```sh
git add index.html styles.css scripts.js assets
git commit -m "Update website"
git push origin main
```

Yayının durumunu [Actions](https://github.com/enginc4n/masabasi-website/actions/workflows/deploy-pages.yml) sayfasından izleyebilirsin. Aynı sayfadaki **Run workflow** düğmesiyle kod değiştirmeden tekrar yayın başlatabilirsin.

İlk kurulumda **Settings → Pages → Build and deployment → Source** değeri **GitHub Actions** olmalıdır. Mevcut repo için bu ayar API üzerinden yapılandırılır. Farklı bir repoya kopyalandığında yeni reponun Pages ayarından tekrar seçilmelidir.

GitHub Pages, herkese açık repolarda GitHub Free ile kullanılabilir; bu proje ek hosting hesabı veya ödeme gerektirmez. [Resmî GitHub Pages belgesi](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

Doğrulama ekran görüntüleri yerelde üretilir ve `.gitignore` ile sürüm kontrolünün dışında tutulur; raporlar ve tekrar çalıştırılabilir tarayıcı kontrolleri repoda bulunur.
