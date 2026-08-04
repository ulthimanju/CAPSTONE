export function getPageNumbers(currentPage, totalPages) {
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}