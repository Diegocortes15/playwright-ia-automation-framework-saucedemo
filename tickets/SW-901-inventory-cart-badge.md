---
key: SW-901
summary: [SW][QA][Inventory] Cart badge reflects the number of items added
---

Feature: inventory

Scenario 1: Badge appears after the first item is added
Given standard_user is on the inventory page with an empty cart
When they add one product to the cart
Then the cart badge shows "1"

Scenario 2: Badge counts each additional item
Given standard_user has one product in the cart
When they add a second product
Then the cart badge shows "2"

Scenario 3: Badge disappears when the cart is emptied
Given standard_user has one product in the cart
When they remove it from the inventory page
Then no cart badge is shown
