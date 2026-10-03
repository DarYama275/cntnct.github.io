const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


document.querySelectorAll('.product-card--clickable[data-href]').forEach(card => {
  const openDetail = () => {
    const href = card.dataset.href;
    if (href) window.location.href = href;
  };

  card.addEventListener('click', event => {
    if (event.target.closest('a, button')) return;
    openDetail();
  });

  card.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a, button')) {
      event.preventDefault();
      openDetail();
    }
  });
});
