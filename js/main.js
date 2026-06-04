/**
 * 上海登盛健康管理咨询有限公司 - 官网交互脚本
 */

(function () {
  'use strict';

  // 当前页面导航高亮
  function setActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-menu a').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const page = href.split('/').pop();
      link.classList.toggle('active', page === current);
    });
  }

  // 移动端菜单
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', menu.classList.contains('open'));
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 滚动时导航阴影
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 数字滚动动画
  function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'), 10);
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = 2000;
          const start = performance.now();

          function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(target * eased);
            if (progress < 1) requestAnimationFrame(update);
            else el.textContent = target;
          }

          requestAnimationFrame(update);
          observer.unobserve(el);
        });
      },
      { threshold: 0.3 }
    );

    counters.forEach(function (c) {
      observer.observe(c);
    });
  }

  // 联系表单（前端演示）
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const msg = document.getElementById('formMessage');
      if (msg) {
        msg.className = 'form-message success';
        msg.textContent = '感谢您的咨询！我们已收到您的信息，将在 1 个工作日内与您联系。';
      }
      form.reset();
    });
  }

  // 服务页锚点导航
  function initServiceNav() {
    const navLinks = document.querySelectorAll('.service-nav a');
    const sections = document.querySelectorAll('.service-block[id]');
    if (!navLinks.length || !sections.length) return;

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          navLinks.forEach(function (l) {
            l.classList.remove('active');
          });
          link.classList.add('active');
        }
      });
    });

    window.addEventListener(
      'scroll',
      function () {
        let current = '';
        sections.forEach(function (section) {
          const top = section.offsetTop - 120;
          if (window.scrollY >= top) current = section.getAttribute('id');
        });
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
      },
      { passive: true }
    );
  }

  // 渐入动画
  function initFadeIn() {
    const items = document.querySelectorAll('.fade-in');
    if (!items.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setActiveNav();
    initMobileNav();
    initHeaderScroll();
    animateCounters();
    initContactForm();
    initServiceNav();
    initFadeIn();
  });
})();
