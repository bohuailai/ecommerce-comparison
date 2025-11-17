// 結果詳情頁面的JavaScript功能
let sessionData = null;
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12;
let sessionId = null;

// 頁面載入完成後初始化
document.addEventListener("DOMContentLoaded", function () {
  console.log("結果詳情頁面載入完成，開始初始化...");
  
  // 從 URL 中獲取 session_id
  const pathParts = window.location.pathname.split('/');
  sessionId = pathParts[pathParts.length - 1];
  
  console.log("URL路徑:", window.location.pathname);
  console.log("解析的 session_id:", sessionId);
  
  if (sessionId && !isNaN(sessionId)) {
    console.log("開始載入結果資料...");
    loadResultData();
    setupEventHandlers();
  } else {
    console.error("無效的任務 ID:", sessionId);
    showError("無效的任務 ID");
    hideLoading();
  }
});

// 顯示錯誤信息
function showError(message) {
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("mainContent").style.display = "none";
  
  // 創建錯誤顯示元素
  const errorDiv = document.createElement("div");
  errorDiv.className = "alert alert-danger text-center";
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
    <h4>載入失敗</h4>
    <p>${message}</p>
    <button class="btn btn-primary" onclick="window.history.back()">返回</button>
  `;
  
  document.querySelector(".container").appendChild(errorDiv);
}

// 隱藏載入動畫
function hideLoading() {
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
}

// 載入結果資料
async function loadResultData() {
  console.log(`開始載入 session ${sessionId} 的資料...`);
  
  try {
    const apiUrl = `/api/result/${sessionId}`;
    console.log("API URL:", apiUrl);
    
    const response = await fetch(apiUrl);
    console.log("API 響應狀態:", response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("API 響應資料:", data);

    if (data.status === "success") {
      sessionData = data.data.session;
      allProducts = data.data.products;
      console.log("Session 資料:", sessionData);
      console.log("商品數量:", allProducts.length);
      
      processResultData();
      updateUI();
      console.log("資料載入完成！");
    } else {
      console.error("載入結果失敗:", data.error);
      showError(data.error || "載入結果失敗");
    }
  } catch (error) {
    console.error("載入結果時發生錯誤:", error);
    showError(`載入結果時發生錯誤: ${error.message}`);
  } finally {
    hideLoading();
  }
}

// 處理結果資料
function processResultData() {
  // 預設按價格由低到高排序
  allProducts.sort((a, b) => (a.price || 0) - (b.price || 0));

  // 初始化篩選結果
  filteredProducts = [...allProducts];

  // 更新標題
  const keyword = sessionData.keyword || "未知";
  document.getElementById(
    "resultTitle"
  ).innerHTML = `<i class="fas fa-search me-2"></i>「${keyword}」搜尋結果 (ID: ${sessionId})`;
}

// 更新UI
function updateUI() {
  updateSummaryCards();
  updatePlatformFilter();
  applyFilters(); // Apply filters to show initial view correctly
}

// 更新摘要卡片
function updateSummaryCards() {
  const totalProducts = allProducts.length;
  const uniquePlatforms = new Set(allProducts.map((p) => p.platform)).size;

  // 計算價格統計
  const prices = allProducts.map((p) => p.price || 0).filter((p) => p > 0);
  const avgPrice =
    prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  document.getElementById("summaryCards").innerHTML = `
        <div class="col-md-3">
            <div class="card bg-primary text-white">
                <div class="card-body text-center">
                    <h3>${totalProducts.toLocaleString()}</h3>
                    <p class="mb-0">總商品數</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white">
                <div class="card-body text-center">
                    <h3>${uniquePlatforms}</h3>
                    <p class="mb-0">平台數</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-info text-white">
                <div class="card-body text-center">
                    <h3>NT$ ${avgPrice.toFixed(0)}</h3>
                    <p class="mb-0">平均價格</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-white">
                <div class="card-body text-center">
                    <h3>NT$ ${minPrice} - ${maxPrice}</h3>
                    <p class="mb-0">價格範圍</p>
                </div>
            </div>
        </div>
    `;
}

// 更新平台篩選
function updatePlatformFilter() {
  const platforms = [...new Set(allProducts.map((p) => p.platform))];
  const filterSelect = document.getElementById("platformFilter");

  filterSelect.innerHTML = '<option value="">全部平台</option>';
  platforms.forEach((platform) => {
    const option = document.createElement("option");
    option.value = platform;
    option.textContent = platform;
    filterSelect.appendChild(option);
  });
}

// 渲染商品
function renderProducts() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageProducts = filteredProducts.slice(startIndex, endIndex);

  // 更新篩選資訊
  document.getElementById("filterInfo").textContent = `顯示 ${
    startIndex + 1
  }-${Math.min(endIndex, filteredProducts.length)} 個商品，共 ${
    filteredProducts.length
  } 個`;

  if (pageProducts.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();

  // 根據當前視圖模式只渲染對應的視圖
  if (document.getElementById("gridView").checked) {
    renderGridView(pageProducts);
    document.getElementById("productsTableBody").innerHTML = "";
  } else {
    renderListView(pageProducts);
    document.getElementById("productsGrid").innerHTML = "";
  }
}

// 渲染卡片視圖
function renderGridView(products) {
  const container = document.getElementById("productsGrid");
  container.innerHTML = "";

  products.forEach((product) => {
    const card = createProductCard(product);
    container.appendChild(card);
  });
}

// 建立商品卡片
function createProductCard(product) {
  const col = document.createElement("div");
  col.className = "product-col mb-4";
  col.style.cssText = "width: 25%; flex: 0 0 25%; max-width: 25%; padding: 0 0.75rem; box-sizing: border-box;";

  const platformClass = "platform-" + product.platform.toLowerCase().replace(/\s+/g, "");
  
  // 創建卡片容器
  const card = document.createElement("div");
  card.className = "card product-card h-100" + (product.is_filtered_out ? " filtered-out" : "");
  
  // 創建圖片
  const img = document.createElement("img");
  img.src = product.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236c757d'%3E無圖片%3C/text%3E%3C/svg%3E";
  img.className = "card-img-top";
  img.alt = product.title;
  img.onerror = function() {
    this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236c757d'%3E載入失敗%3C/text%3E%3C/svg%3E";
  };
  
  // 創建卡片內容
  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";
  
  const title = document.createElement("h6");
  title.className = "product-title";
  title.textContent = product.title;
  
  const autoDiv = document.createElement("div");
  autoDiv.className = "mt-auto";
  
  const priceDiv = document.createElement("div");
  priceDiv.className = "product-price";
  priceDiv.innerHTML = buildPriceChipHTML(product.price);
  
  const actionDiv = document.createElement("div");
  actionDiv.className = "d-flex justify-content-between align-items-center";
  
  const platformSpan = document.createElement("span");
  platformSpan.className = "product-platform " + platformClass;
  platformSpan.textContent = product.platform;
  
  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group";
  
  const linkBtn = document.createElement("a");
  linkBtn.href = product.url;
  linkBtn.target = "_blank";
  linkBtn.className = "btn btn-sm btn-outline-primary";
  linkBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
  
  const compareBtn = document.createElement("button");
  compareBtn.className = "btn btn-sm btn-outline-success";
  compareBtn.onclick = function() { compareProduct(product); };
  compareBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
  
  // 組裝元素
  btnGroup.appendChild(linkBtn);
  btnGroup.appendChild(compareBtn);
  actionDiv.appendChild(platformSpan);
  actionDiv.appendChild(btnGroup);
  autoDiv.appendChild(priceDiv);
  autoDiv.appendChild(actionDiv);
  cardBody.appendChild(title);
  cardBody.appendChild(autoDiv);
  card.appendChild(img);
  card.appendChild(cardBody);
  col.appendChild(card);

  return col;
}

// 渲染列表視圖
function renderListView(products) {
  const container = document.getElementById("productsTableBody");
  container.innerHTML = "";

  products.forEach((product) => {
    const row = createProductRow(product);
    container.appendChild(row);
  });
}

// 建立商品行
function createProductRow(product) {
  const platformClass = "platform-" + product.platform.toLowerCase().replace(/\s+/g, "");
  const row = document.createElement("tr");
  row.className = "align-middle";
  
  // 創建各個 cell
  const imageCell = document.createElement("td");
  imageCell.className = "text-center";
  
  const img = document.createElement("img");
  img.src = product.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236c757d'%3E無圖片%3C/text%3E%3C/svg%3E";
  img.alt = product.title;
  img.width = 100;
  img.height = 100;
  img.onerror = function() {
    this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236c757d'%3E載入失敗%3C/text%3E%3C/svg%3E";
  };
  imageCell.appendChild(img);
  
  const titleCell = document.createElement("td");
  titleCell.innerHTML = '<div class="fw-bold">' + product.title + '</div>' +
    '<div class="text-muted"><span class="product-platform ' + platformClass + '">' + product.platform + '</span></div>';
  
  const priceCell = document.createElement("td");
  priceCell.className = "text-end";
  priceCell.innerHTML = '<div class="product-price">' + buildPriceChipHTML(product.price) + '</div>';
  
  const actionCell = document.createElement("td");
  actionCell.className = "text-end";
  const btn = document.createElement("button");
  btn.className = "btn btn-sm btn-outline-success";
  btn.onclick = function() { compareProduct(product); };
  btn.innerHTML = '<i class="fas fa-chart-line"></i>';
  actionCell.appendChild(btn);
  
  // 組裝 row
  row.appendChild(imageCell);
  row.appendChild(titleCell);
  row.appendChild(priceCell);
  row.appendChild(actionCell);

  return row;
}

// 設定事件處理器
function setupEventHandlers() {
  document.getElementById("platformFilter").addEventListener("change", (e) => {
    const selectedPlatform = e.target.value;
    filterProducts(selectedPlatform);
  });

  document.getElementById("priceSortAsc").addEventListener("click", () => {
    sortProducts("asc");
  });

  document.getElementById("priceSortDesc").addEventListener("click", () => {
    sortProducts("desc");
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    resetFilters();
  });

  document.getElementById("gridView").addEventListener("change", () => {
    renderProducts();
  });

  document.getElementById("listView").addEventListener("change", () => {
    renderProducts();
  });

  // 頁碼按鈕事件委派
  document.getElementById("pagination").addEventListener("click", (e) => {
    if (e.target.matches(".page-link")) {
      const newPage = parseInt(e.target.dataset.page);
      if (newPage !== currentPage) {
        currentPage = newPage;
        renderProducts();
      }
    }
  });
}

// 篩選商品
function filterProducts(selectedPlatform) {
  // 根據選擇的平台篩選商品
  if (selectedPlatform) {
    filteredProducts = allProducts.filter(product => product.platform === selectedPlatform);
  } else {
    filteredProducts = [...allProducts];
  }
  
  // 重置到第一頁
  currentPage = 1;
  
  // 重新渲染
  renderProducts();
  updatePagination();
}

// 排序商品
function sortProducts(direction) {
  if (direction === "asc") {
    filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (direction === "desc") {
    filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  }
  
  // 重置到第一頁
  currentPage = 1;
  
  // 重新渲染
  renderProducts();
  updatePagination();
}

// 重置篩選器
function resetFilters() {
  // 重置篩選條件
  document.getElementById("platformFilter").value = "";
  
  // 重置商品列表
  filteredProducts = [...allProducts];
  
  // 重置排序（按價格由低到高）
  filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  
  // 重置到第一頁
  currentPage = 1;
  
  // 重新渲染
  renderProducts();
  updatePagination();
}

// 應用篩選
function applyFilters() {
  const platformFilter = document.getElementById("platformFilter").value;
  filterProducts(platformFilter);
}

// 顯示空狀態
function showEmptyState() {
  const container = document.getElementById("productsGrid");
  const tableContainer = document.getElementById("productsTableBody");
  
  if (container) {
    container.innerHTML = '<div class="col-12 text-center py-5">' +
      '<i class="fas fa-search fa-3x text-muted mb-3"></i>' +
      '<h4 class="text-muted">沒有找到符合條件的商品</h4>' +
      '<p class="text-muted">請嘗試調整篩選條件</p>' +
      '<button class="btn btn-outline-primary" onclick="resetFilters()">重置篩選</button>' +
      '</div>';
  }
  
  if (tableContainer) {
    tableContainer.innerHTML = "";
  }
  
  // 隱藏分頁
  const pagination = document.getElementById("pagination");
  if (pagination) {
    pagination.innerHTML = "";
  }
}

// 隱藏空狀態
function hideEmptyState() {
  // 這個函數在 renderProducts 中被調用，確保正常顯示商品
}

// 更新分頁
function updatePagination() {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const pagination = document.getElementById("pagination");
  
  if (!pagination) return;
  
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }
  
  let paginationHTML = "";
  
  // 上一頁
  if (currentPage > 1) {
    paginationHTML += '<li class="page-item">' +
      '<a class="page-link" href="#" data-page="' + (currentPage - 1) + '">上一頁</a>' +
      '</li>';
  }
  
  // 頁碼
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      paginationHTML += '<li class="page-item active">' +
        '<span class="page-link">' + i + '</span>' +
        '</li>';
    } else {
      paginationHTML += '<li class="page-item">' +
        '<a class="page-link" href="#" data-page="' + i + '">' + i + '</a>' +
        '</li>';
    }
  }
  
  // 下一頁
  if (currentPage < totalPages) {
    paginationHTML += '<li class="page-item">' +
      '<a class="page-link" href="#" data-page="' + (currentPage + 1) + '">下一頁</a>' +
      '</li>';
  }
  
  pagination.innerHTML = paginationHTML;
}

// 商品比較功能
function compareProduct(product) {
  console.log("開始比較商品:", product);
  
  // 這裡可以整合之前的商品比價功能
  // 暫時顯示一個簡單的 alert
  var message = "商品比較功能\n\n";
  message += "商品: " + product.title + "\n";
  message += "價格: NT$ " + product.price + "\n";
  message += "平台: " + product.platform + "\n\n";
  message += "此功能正在開發中...";
  alert(message);
  
  // TODO: 整合 ProductComparisonService 的比價功能
}

// 格式化價格
function formatPrice(price) {
  if (!price || price === "N/A" || price === "未知") {
    return "價格未知";
  }

  let priceStr = price.toString();
  priceStr = priceStr.replace(/^(NT\$)+/g, "NT$");
  const cleanPrice = priceStr.replace(/NT\$|[$￥¥元,\s]/g, "").replace(/[^\d.-]/g, "");
  const numeric = parseFloat(cleanPrice);

  if (isNaN(numeric) || numeric <= 0) {
    return "價格未知";
  }

  return "NT$ " + numeric.toLocaleString();
}

function buildPriceChipHTML(price) {
  const formatted = formatPrice(price);
  if (!formatted || formatted === "價格未知") {
    return '<span class="price-value">價格未知</span>';
  }

  const match = formatted.match(/^(NT\$)\s*(.+)$/);
  if (match) {
    return '<span class="price-currency">' + match[1] + '</span>' +
           '<span class="price-value">' + match[2] + '</span>';
  }

  return '<span class="price-value">' + formatted + '</span>';
}

// 格式化平台名稱
function formatPlatformName(platform) {
  const platformNames = {
    'carrefour': '家樂福',
    'pchome': 'PChome',
    'routn': '露天',
    'yahoo': 'Yahoo'
  };
  
  return platformNames[platform] || platform;
}

// 檢查元素是否存在
function checkElementExists(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn("元素不存在: " + elementId);
    return false;
  }
  return true;
}

// 初始化完成後的回調
function onInitComplete() {
  console.log("結果詳情頁面初始化完成");
  
  // 添加初始渲染
  if (filteredProducts.length > 0) {
    renderProducts();
    updatePagination();
  }
}

// 頁面載入完成後執行初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 載入完成');
  
  // 延遲一點點確保所有元素都已經渲染
  setTimeout(() => {
    onInitComplete();
  }, 100);
});

console.log("result_detail.js 載入完成");