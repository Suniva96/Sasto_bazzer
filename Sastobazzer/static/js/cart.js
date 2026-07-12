/* ==========================================================
   SastoBazaar — cart.js
   Handles: storing cart data, wiring "Add to Cart" buttons on
   every page, and rendering the cart on cart.html
   ========================================================== */

(function () {

  const CART_KEY = "sastobazaar_cart";
  const DELIVERY_FEE = 100; // flat delivery fee, only charged when cart isn't empty

  /* ----------------------------------------------------------
     STORAGE HELPERS
  ---------------------------------------------------------- */

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function parsePrice(text) {
    // turns "Rs. 55,000" into 55000
    return Number(String(text).replace(/[^0-9.]/g, "")) || 0;
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /* ----------------------------------------------------------
     CART OPERATIONS
  ---------------------------------------------------------- */

  function addToCart(item) {
    const cart = getCart();
    const existing = cart.find((p) => p.id === item.id);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }

    saveCart(cart);
    renderCart();
  }

  function removeFromCart(id) {
    const cart = getCart().filter((p) => p.id !== id);
    saveCart(cart);
    renderCart();
  }

  function changeQty(id, delta) {
    const cart = getCart();
    const item = cart.find((p) => p.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty < 1) item.qty = 1;

    saveCart(cart);
    renderCart();
  }

  function clearCart() {
    saveCart([]);
    renderCart();
  }

  function cartCount() {
    return getCart().reduce((sum, p) => sum + p.qty, 0);
  }

  /* ----------------------------------------------------------
     NAVBAR CART BADGE (works on every page)
  ---------------------------------------------------------- */

  function updateCartBadge() {
    const count = cartCount();
    document.querySelectorAll(".cart-count").forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    });
  }

  /* ----------------------------------------------------------
     WIRE UP "Add to Cart" BUTTONS ON PRODUCT / CATEGORY PAGES
     Looks for the pattern used across the site:
     <div class="product-card"> ... <h4> ... <p class="price">
     ... <button class="cart-btn"> </div>
  ---------------------------------------------------------- */

  function attachAddToCartButtons() {
    document.querySelectorAll(".product-card").forEach((card) => {
      const btn = card.querySelector(".cart-btn");
      if (!btn) return;

      btn.addEventListener("click", function () {
        const nameEl = card.querySelector("h4");
        const priceEl = card.querySelector(".price");
        const imgEl = card.querySelector("img");

        const name = nameEl ? nameEl.textContent.trim() : "Product";
        const price = priceEl ? parsePrice(priceEl.textContent) : 0;
        const image = imgEl ? imgEl.getAttribute("src") : "";
        const id = card.dataset.id || slugify(name);

        addToCart({ id, name, price, image });

        const original = btn.textContent;
        btn.textContent = "Added ✓";
        btn.disabled = true;

        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
        }, 900);
      });
    });
  }

  /* ----------------------------------------------------------
     RENDER THE CART PAGE (only runs if #cart-items exists)
  ---------------------------------------------------------- */

  function renderCart() {
    const container = document.getElementById("cart-items");
    if (!container) return; // not on cart.html, nothing to do

    const emptyState = document.getElementById("cart-empty");
    const summary = document.getElementById("cart-summary");
    const cart = getCart();

    if (cart.length === 0) {
      container.innerHTML = "";
      container.style.display = "none";
      if (emptyState) emptyState.style.display = "flex";
      if (summary) summary.style.display = "none";
      return;
    }

    container.style.display = "flex";
    if (emptyState) emptyState.style.display = "none";
    if (summary) summary.style.display = "block";

    container.innerHTML = cart
      .map(
        (item) => `
      <div class="cart-row" data-id="${item.id}">

        <img src="${item.image}" alt="${item.name}">

        <div class="cart-row-info">
          <h4>${item.name}</h4>
          <p class="row-price">Rs. ${item.price.toLocaleString()}</p>
        </div>

        <div class="qty-control">
          <button class="qty-btn minus" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn plus" aria-label="Increase quantity">+</button>
        </div>

        <div class="row-total">Rs. ${(item.price * item.qty).toLocaleString()}</div>

        <button class="remove-btn" aria-label="Remove item">
          <i class="fa fa-trash"></i>
        </button>

      </div>
    `
      )
      .join("");

    container.querySelectorAll(".cart-row").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector(".minus").addEventListener("click", () => changeQty(id, -1));
      row.querySelector(".plus").addEventListener("click", () => changeQty(id, 1));
      row.querySelector(".remove-btn").addEventListener("click", () => removeFromCart(id));
    });

    const subtotal = cart.reduce((sum, p) => sum + p.price * p.qty, 0);
    const delivery = subtotal > 0 ? DELIVERY_FEE : 0;
    const total = subtotal + delivery;

    setText("subtotal", "Rs. " + subtotal.toLocaleString());
    setText("delivery-fee", "Rs. " + delivery.toLocaleString());
    setText("total", "Rs. " + total.toLocaleString());
    setText("item-count", cartCount());
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {
    attachAddToCartButtons();
    updateCartBadge();
    renderCart();

    const clearBtn = document.getElementById("clear-cart");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (confirm("Remove all items from your cart?")) clearCart();
      });
    }

    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () {
        if (getCart().length === 0) {
          alert("Your cart is empty.");
          return;
        }
        alert("Thank you! Your order has been placed. (Demo checkout)");
        clearCart();
      });
    }
  });

  // Expose for debugging / reuse from other scripts if needed
  window.SastoCart = { addToCart, removeFromCart, changeQty, clearCart, getCart };

})();
