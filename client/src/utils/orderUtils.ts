/**
 * Fractional Indexing Utility
 * 
 * Provides helper functions for generating order keys between existing items.
 * Uses the fractional-indexing library under the hood.
 */

import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Generate a key for inserting an item between two existing items.
 * 
 * @param before - The order key of the item before the insertion point (or null if inserting at start)
 * @param after - The order key of the item after the insertion point (or null if inserting at end)
 * @returns A new order key that sorts between `before` and `after`
 * 
 * @example
 * getOrderBetween(null, 'a0')  // Returns key before 'a0'
 * getOrderBetween('a0', 'a1')  // Returns key between 'a0' and 'a1'
 * getOrderBetween('a1', null)  // Returns key after 'a1'
 */
export function getOrderBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

/**
 * Generate multiple keys for inserting n items between two existing items.
 * Useful for bulk operations.
 * 
 * @param before - The order key before the insertion point
 * @param after - The order key after the insertion point
 * @param n - Number of keys to generate
 * @returns Array of n order keys that sort between `before` and `after`
 */
export function getOrdersBetween(before: string | null, after: string | null, n: number): string[] {
  return generateNKeysBetween(before, after, n);
}

/**
 * Generate an initial order key for the first item in a list.
 * 
 * @returns An order key for the first item
 */
export function getInitialOrder(): string {
  return generateKeyBetween(null, null);
}

/**
 * Generate an order key for appending to the end of a list.
 * 
 * @param lastOrder - The order key of the current last item (or null if list is empty)
 * @returns An order key that comes after `lastOrder`
 */
export function getOrderAfter(lastOrder: string | null): string {
  return generateKeyBetween(lastOrder, null);
}

/**
 * Generate an order key for prepending to the start of a list.
 * 
 * @param firstOrder - The order key of the current first item (or null if list is empty)
 * @returns An order key that comes before `firstOrder`
 */
export function getOrderBefore(firstOrder: string | null): string {
  return generateKeyBetween(null, firstOrder);
}

/**
 * Calculate the order key for moving an item to a specific index in a sorted list.
 * 
 * @param sortedOrders - Array of existing order keys, sorted ascending
 * @param targetIndex - The index where the item should be inserted
 * @returns A new order key for that position
 * 
 * @example
 * const orders = ['a0', 'a1', 'a2'];
 * getOrderForIndex(orders, 0)  // Returns key before 'a0'
 * getOrderForIndex(orders, 1)  // Returns key between 'a0' and 'a1'
 * getOrderForIndex(orders, 3)  // Returns key after 'a2'
 */
export function getOrderForIndex(sortedOrders: string[], targetIndex: number): string {
  if (sortedOrders.length === 0) {
    return getInitialOrder();
  }

  if (targetIndex <= 0) {
    return getOrderBefore(sortedOrders[0]);
  }

  if (targetIndex >= sortedOrders.length) {
    return getOrderAfter(sortedOrders[sortedOrders.length - 1]);
  }

  // Inserting between two items
  const before = sortedOrders[targetIndex - 1];
  const after = sortedOrders[targetIndex];
  return getOrderBetween(before, after);
}

/**
 * Sort an array of items by their order key.
 * Items without an order key are placed at the end.
 * 
 * @param items - Array of items with optional `order` property
 * @returns New array sorted by order
 */
export function sortByOrder<T extends { order?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // Items without order go to the end
    if (!a.order && !b.order) return 0;
    if (!a.order) return 1;
    if (!b.order) return -1;
    return a.order.localeCompare(b.order);
  });
}
