---
key: SW-902
summary: [SW][QA][Inventory] Sorting works for problem_user
---

Feature: inventory

Scenario 1: problem_user sorts products Z to A
Given problem_user is on the inventory page
When they select "Name (Z to A)" from the sort dropdown
Then the products are listed in descending alphabetical order

Scenario 2: problem_user sorts by price low to high
Given problem_user is on the inventory page
When they select "Price (low to high)" from the sort dropdown
Then the products are listed from cheapest to most expensive
