# Component Detection Signatures

This file holds the **per-component root-selector signatures** the `scaffold-page-object` skill uses to recognize framework components in a live page snapshot.

The **canonical list of components** is `src/components/*.ts` — this doc holds the per-component "how to spot it on a page" details. The skill compares the two at step 4 of its workflow and warns when a component file exists with no signature here.

## Signatures

| Component      | Import path                | Root signature                                     | When detected, skip these elements                                                          |
| -------------- | -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Header`       | `@components/Header`       | `#react-burger-menu-btn` AND `.app_logo` present   | burger menu, logo, cart icon, logout link, navigation links                                 |
| `CartBadge`    | `@components/CartBadge`    | `[data-test="shopping-cart-badge"]` (when count>0) | the badge counter span                                                                      |
| `ProductCard`  | `@components/ProductCard`  | `[data-test="inventory-item"]` (multiple)          | per-card name, price, add/remove buttons (use `new ProductCard(page, productName)` instead) |
| `SortDropdown` | `@components/SortDropdown` | `[data-test="product-sort-container"]`             | the sort `<select>` element                                                                 |
| `Footer`       | `@components/Footer`       | `[data-test="footer"]`                             | the social links (twitter/facebook/linkedin) and the copyright line                         |

Header always implies CartBadge availability (Header composes CartBadge per Phase A).

## Adding a new component

When a new component lands in `src/components/`, **append a row here BEFORE running the skill against any page that contains the new component.** Otherwise the skill aborts at step 4 with the auto-discover warning, listing the missing component file and pointing here.
