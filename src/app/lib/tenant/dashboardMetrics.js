import { OrderModel } from "@/models/tenant/Order";
import { ProductModel } from "@/models/tenant/Product";
import { TenantSettingModel } from "@/models/tenant/TenantSetting";

const TERMINAL_STATUSES = ["CANCELLED", "DELETED"];
const SALES_STATUS = "COMPLETED";

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toId = (value) => (value === null || value === undefined ? "" : String(value));

const resolveItemRevenue = (item) => {
  const totalPrice = toNumber(item?.totalPrice);
  if (totalPrice > 0) {
    return totalPrice;
  }
  const unitPrice = toNumber(item?.unitPrice || item?.price);
  return unitPrice * toNumber(item?.quantity);
};

// Boundaries for the selected range plus the immediately preceding equivalent
// window (used for trend comparison).
const getRangeBounds = (range, now = new Date()) => {
  const end = now;
  const start = new Date(now);

  if (range === "week") {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  const prevEnd = new Date(start);
  const prevStart = new Date(start);
  const spanDays = range === "week" ? 7 : range === "month" ? 30 : 1;
  prevStart.setDate(start.getDate() - spanDays);

  return { start, end, prevStart, prevEnd, spanDays };
};

const buildSeriesBuckets = (range, start, end) => {
  // today -> hourly buckets; week/month -> daily buckets.
  const buckets = [];
  if (range === "today") {
    for (let hour = 0; hour < 24; hour += 2) {
      const label = `${String(hour).padStart(2, "0")}:00`;
      buckets.push({ label, value: 0, hour });
    }
    return { buckets, mode: "hour" };
  }

  const days = range === "week" ? 7 : 30;
  const cursor = new Date(start);
  for (let i = 0; i < days; i += 1) {
    const label = cursor.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
    buckets.push({
      label,
      value: 0,
      dayKey: `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return { buckets, mode: "day" };
};

const addToSeries = (series, date, amount) => {
  if (series.mode === "hour") {
    const hour = date.getHours();
    // 2-hour buckets: map hour -> nearest lower even index.
    const bucketHour = hour - (hour % 2);
    const bucket = series.buckets.find((entry) => entry.hour === bucketHour);
    if (bucket) {
      bucket.value += amount;
    }
    return;
  }
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const bucket = series.buckets.find((entry) => entry.dayKey === dayKey);
  if (bucket) {
    bucket.value += amount;
  }
};

const computeTrend = (current, previous) => {
  if (!previous) {
    // No baseline: treat any positive current as a full increase, else flat.
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const getTenantCategoryLookup = async (conn) => {
  const TenantSetting = TenantSettingModel(conn);
  const settings = await TenantSetting.find({}).lean();
  const categorySetting = (Array.isArray(settings) ? settings : []).find((setting) => {
    const description = String(setting?.description ?? "").toLowerCase();
    return description.includes("product category") || description.includes("categoria");
  });
  const categories = Array.isArray(categorySetting?.data) ? categorySetting.data : [];
  return categories.reduce((acc, category) => {
    if (category?.id) {
      acc[category.id] = category.label ?? category.id;
    }
    return acc;
  }, {});
};

export async function getDashboardMetrics(
  conn,
  { range = "today", categoryId = "all", includeKitchenStatus = true } = {}
) {
  const Order = OrderModel(conn);
  const Product = ProductModel(conn);

  const { start, end, prevStart } = getRangeBounds(range);
  const normalizedCategory = categoryId && categoryId !== "all" ? String(categoryId) : null;

  const [orders, products, categoryLookup] = await Promise.all([
    Order.find({
      createdAt: { $gte: prevStart, $lte: end },
      status: { $nin: ["DELETED"] },
    })
      .sort({ createdAt: -1 })
      .lean(),
    Product.find({}, { name: 1, categoryId: 1 }).lean(),
    getTenantCategoryLookup(conn),
  ]);

  const productMap = new Map();
  (Array.isArray(products) ? products : []).forEach((product) => {
    productMap.set(toId(product?._id), {
      name: product?.name ?? "",
      categoryId: product?.categoryId ?? null,
    });
  });

  const itemMatchesCategory = (item) => {
    if (!normalizedCategory) {
      return true;
    }
    const product = productMap.get(toId(item?.productId));
    return product?.categoryId === normalizedCategory;
  };

  // Per-order helpers honoring the category filter.
  const orderRevenue = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!normalizedCategory) {
      const total = toNumber(order?.total);
      return total > 0 ? total : items.reduce((acc, item) => acc + resolveItemRevenue(item), 0);
    }
    return items.reduce(
      (acc, item) => (itemMatchesCategory(item) ? acc + resolveItemRevenue(item) : acc),
      0
    );
  };

  const orderBelongs = (order) => {
    if (!normalizedCategory) {
      return true;
    }
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.some(itemMatchesCategory);
  };

  const isActiveOrder = (order) =>
    order?.isClosed === false && !TERMINAL_STATUSES.includes(order?.status);

  const currentOrders = [];
  const previousOrders = [];
  for (const order of orders) {
    if (!orderBelongs(order)) {
      continue;
    }
    const createdAt = new Date(order.createdAt);
    if (createdAt >= start) {
      currentOrders.push(order);
    } else if (createdAt >= prevStart) {
      previousOrders.push(order);
    }
  }

  const salesOf = (list) =>
    list
      .filter((order) => order.status === SALES_STATUS)
      .reduce((acc, order) => acc + orderRevenue(order), 0);

  const completedOf = (list) => list.filter((order) => order.status === SALES_STATUS);

  const currentSales = salesOf(currentOrders);
  const previousSales = salesOf(previousOrders);
  const currentCompleted = completedOf(currentOrders);
  const previousCompleted = completedOf(previousOrders);

  const currentOrdersCount = currentOrders.filter(
    (order) => !TERMINAL_STATUSES.includes(order.status)
  ).length;
  const previousOrdersCount = previousOrders.filter(
    (order) => !TERMINAL_STATUSES.includes(order.status)
  ).length;

  const pendingOrders = currentOrders.filter(isActiveOrder).length;

  const averageTicket = currentCompleted.length ? currentSales / currentCompleted.length : 0;
  const previousAverageTicket = previousCompleted.length
    ? previousSales / previousCompleted.length
    : 0;

  const salesTrend = computeTrend(currentSales, previousSales);

  // Sales series (completed orders, by time bucket).
  const series = buildSeriesBuckets(range, start, end);
  currentCompleted.forEach((order) => {
    const when = new Date(order.closedAt ?? order.createdAt);
    addToSeries(series, when, orderRevenue(order));
  });

  // Top products from completed orders.
  const productAgg = new Map();
  currentCompleted.forEach((order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    items.forEach((item) => {
      if (!itemMatchesCategory(item)) {
        return;
      }
      const id = toId(item?.productId);
      const product = productMap.get(id);
      const entry = productAgg.get(id) || {
        id,
        name: product?.name || item?.productName || "—",
        category: product?.categoryId ? categoryLookup[product.categoryId] ?? "" : "",
        revenue: 0,
        salesCount: 0,
      };
      entry.revenue += resolveItemRevenue(item);
      entry.salesCount += toNumber(item?.quantity);
      productAgg.set(id, entry);
    });
  });

  const topProductsRaw = Array.from(productAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRevenue = topProductsRaw[0]?.revenue || 0;
  const topProducts = topProductsRaw.map((product) => ({
    ...product,
    progress: maxRevenue > 0 ? Math.round((product.revenue / maxRevenue) * 100) : 0,
  }));

  // Recent orders (latest within the current period that match the filter).
  const recentOrders = currentOrders.slice(0, 6).map((order) => ({
    id: toId(order?._id),
    shortId: `#${toId(order?._id).slice(-5).toUpperCase()}`,
    table: order?.tableLabel || order?.tableId || "",
    customer: order?.customerName || "",
    waiter: order?.createdBy?.name || "",
    status: order?.status || "DRAFT",
    // Sin el modulo de cocina contratado no hay estado de cocina que mostrar;
    // el badge de la tabla lo combina con el estado del pedido.
    kitchenStatus: includeKitchenStatus ? order?.kitchenStatus || null : null,
    total: orderRevenue(order) || toNumber(order?.total),
  }));

  return {
    range,
    categoryId: normalizedCategory ?? "all",
    stats: {
      totalSales: currentSales,
      totalSalesTrend: salesTrend,
      totalOrders: currentOrdersCount,
      totalOrdersTrend: computeTrend(currentOrdersCount, previousOrdersCount),
      pendingOrders,
      averageTicket,
      averageTicketTrend: computeTrend(averageTicket, previousAverageTicket),
      growth: salesTrend,
    },
    salesSeries: series.buckets.map(({ label, value }) => ({ label, value })),
    topProducts,
    recentOrders,
  };
}
