(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (!hasGsap || reduced) document.documentElement.classList.add("reduced");

  document.getElementById("year").textContent = new Date().getFullYear();

  // Nav background
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Cursor dot
  const cursor = document.querySelector(".cursor");
  if (window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("mousemove", (e) => {
      cursor.style.opacity = 1;
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });
    document.querySelectorAll("a, .card").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-big"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-big"));
    });
  }

  // Count-up numbers
  const fmt = (n) => n.toLocaleString("en-US");
  const countUp = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = fmt(end) + suffix; return; }
    const t0 = performance.now();
    const dur = 1600;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3)))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); } });
  }, { threshold: 0.4 });
  document.querySelectorAll(".stats [data-count]").forEach((el) => io.observe(el));

  // Phone feed: step -> screen
  const steps = [...document.querySelectorAll(".step")];
  const screens = [...document.querySelectorAll(".screen")];
  let current = -1;
  let storyTimer = null;

  const runStory = (screen) => {
    clearInterval(storyTimer);
    const imgs = [...screen.querySelectorAll(".story-slides img")];
    const bars = [...screen.querySelectorAll(".story-bars i")];
    let i = 0;
    const show = () => {
      imgs.forEach((im, k) => im.classList.toggle("on", k === i));
      bars.forEach((b, k) => { b.classList.toggle("done", k < i); b.classList.remove("on"); });
      void bars[i].offsetWidth;
      bars[i].classList.add("on");
      i = (i + 1) % imgs.length;
    };
    show();
    storyTimer = setInterval(show, 2500);
  };

  // On phones the feed sits inside the open brand, so a tap shows its change right there
  const phoneWrap = document.querySelector(".phone-wrap");
  const workBody = document.querySelector(".work__body");
  const narrow = window.matchMedia("(max-width: 900px)");
  const placePhone = () => {
    if (narrow.matches && current >= 0) {
      const host = steps[current].querySelector(".step__body > div");
      if (phoneWrap.parentElement !== host) host.prepend(phoneWrap);
    } else if (phoneWrap.parentElement !== workBody) {
      workBody.appendChild(phoneWrap);
    }
  };
  narrow.addEventListener("change", placePhone);

  const setScreen = (i) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => {
      s.classList.toggle("is-active", k === i);
      s.querySelector(".step__head").setAttribute("aria-expanded", k === i);
    });
    screens.forEach((s, k) => s.classList.toggle("is-active", k === i));
    placePhone();
    const scr = screens[i];
    scr.querySelectorAll("[data-count]").forEach((el) => { delete el.dataset.done; countUp(el); });
    if (scr.classList.contains("screen--story")) runStory(scr); else clearInterval(storyTimer);
    document.querySelectorAll(".screen video").forEach((v) => {
      if (scr.contains(v)) { v.play().catch(() => {}); } else { v.pause(); }
    });
  };
  // Auto-advance while the section is on screen; a tap takes over
  const bar = document.querySelector(".work__progress i");
  const DWELL = 7000;
  let autoplay = !reduced && !window.matchMedia("(max-width: 900px)").matches, visible = false, t0 = 0;
  const loop = (t) => {
    if (autoplay && visible) {
      if (!t0) t0 = t;
      const p = (t - t0) / DWELL;
      bar.style.width = Math.min(p, 1) * 100 + "%";
      if (p >= 1) { t0 = t; setScreen((current + 1) % steps.length); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; t0 = 0; }, { threshold: 0.35 })
    .observe(document.querySelector(".work"));
  steps.forEach((s, k) => s.querySelector(".step__head").addEventListener("click", () => {
    autoplay = false; bar.style.width = "0"; setScreen(k);
    if (narrow.matches) {
      // wait for the previous brand to finish closing, then bring this one to the top
      setTimeout(() => {
        const y = s.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
      }, reduced ? 0 : 520);
    }
  }));
  setScreen(0);

  // Back to top
  const toTop = document.querySelector(".to-top");
  window.addEventListener("scroll", () => toTop.classList.toggle("is-on", window.scrollY > innerHeight * 0.8), { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

  if (!hasGsap || reduced) return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero intro
  const curve = document.querySelector(".hero__curve path");
  const len = curve.getTotalLength();
  gsap.set(curve, { strokeDasharray: len, strokeDashoffset: len });
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from(".hero__line .split", { yPercent: 110, duration: 1.3, stagger: 0.12 })
    .from(".hero__portrait", { y: 120, opacity: 0, duration: 1.4 }, "-=1")
    .to(curve, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" }, "-=1.2")
    .from(".hero__badge", { scale: 0, rotate: -90, duration: 1 }, "-=1.6")
    .to(".hero .reveal", { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, "-=1.4");

  // Hero parallax (mouse + scroll)
  const portrait = document.querySelector(".hero__portrait");
  const title = document.querySelector(".hero__title");
  if (window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("mousemove", (e) => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      gsap.to(portrait, { x: x * 24, y: y * 14, rotate: x * 2, duration: 1, ease: "power3.out" });
      gsap.to(title, { x: -x * 30, duration: 1.2, ease: "power3.out" });
    });
  }
  gsap.to(".hero__line--big", { scale: 1.15, opacity: 0.25, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(portrait, { yPercent: 12, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // Generic reveals
  gsap.utils.toArray("main > section:not(.hero) .reveal:not(.h2)").forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  gsap.utils.toArray(".h2, .contact__title").forEach((el) => {
    gsap.fromTo(el, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  gsap.from(".about__media", { rotate: -12, scale: 0.9, scrollTrigger: { trigger: ".about", start: "top 80%", end: "center center", scrub: true } });

  // Phone tilts toward the mouse (desktop)
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px) and (hover: hover)", () => {
    const wrap = document.querySelector(".phone-wrap");
    const move = (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(".phone", { rotateY: x * 26, rotateX: -y * 14, duration: 0.8, ease: "power3.out" });
    };
    const reset = () => gsap.to(".phone", { rotateY: -14, rotateX: 6, duration: 1.2, ease: "power3.out" });
    wrap.addEventListener("mousemove", move);
    wrap.addEventListener("mouseleave", reset);
    return () => { wrap.removeEventListener("mousemove", move); wrap.removeEventListener("mouseleave", reset); };
  });
  gsap.from(".phone", { y: 120, opacity: 0, rotateY: -50, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".work", start: "top 70%" } });

  // Service cards stagger
  gsap.to(".card", { opacity: 1, y: 0, stagger: 0.08, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".cards", start: "top 80%" } });

  // Horizontal photo strip
  const track = document.querySelector(".strip__track");
  gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth + 40), ease: "none",
    scrollTrigger: { trigger: ".strip", start: "top 75%", end: "bottom top", scrub: 1, invalidateOnRefresh: true }
  });

  // Marquee speeds with scroll velocity
  const mq = document.querySelector(".marquee__track");
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = Math.min(Math.abs(self.getVelocity()) / 1000, 3);
      mq.style.animationDuration = `${28 / (1 + v)}s`;
    }
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
