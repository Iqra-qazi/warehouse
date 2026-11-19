import api from "./axios.js";

const stockPageSize = 50;

export async function fetchAllStock() {
  const firstResponse = await api.get("/stock", {
    params: { page: 1, limit: stockPageSize },
  });
  const firstPage = firstResponse.data;
  if (!Array.isArray(firstPage?.stock) || !Number.isInteger(firstPage?.pages) || firstPage.pages < 0) {
    throw new Error("Stock response was invalid.");
  }

  if (firstPage.pages <= 1) return firstPage.stock;

  const remainingResponses = await Promise.all(
    Array.from({ length: firstPage.pages - 1 }, (_, index) =>
      api.get("/stock", { params: { page: index + 2, limit: stockPageSize } })
    )
  );
  const remainingPages = remainingResponses.map((response) => response.data?.stock);
  if (remainingPages.some((records) => !Array.isArray(records))) {
    throw new Error("Stock response was invalid.");
  }

  return firstPage.stock.concat(...remainingPages);
}
