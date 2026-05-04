# Live Sales Assistant (Borlo) Demo

## Project Purpose

This project, "Live Sales Assistant" (codenamed "Borlo"), is a demonstration of a system designed to streamline live shopping operations. Its core function is to automate the processing of customer comments during a live sale, converting them into actionable orders, managing stock, tracking payments, and generating packing lists.

## MVP Promise: Comment → Order → Payment → Stock → Packing list

The application successfully implements the full Minimum Viable Product (MVP) flow:

1.  **Comment Processing:** Automatically parses customer comments during a live stream to identify purchase intent, product codes, colors, sizes, and quantities.
2.  **Order Creation:** Converts parsed comments into pending orders, reserving stock for each item.
3.  **Payment Tracking:** Matches incoming payment events (simulated QPay) with pending orders, updating their status to "Paid". It supports matching single payments to single or multiple orders based on amount and buyer information.
4.  **Stock Management:** Dynamically adjusts product stock levels. Stock is reserved when an order is created and released if an order expires or is cancelled. Real-time updates ensure accurate inventory.
5.  **Packing List Generation:** Generates a comprehensive list of all paid orders, ready for fulfillment. This list can be exported in CSV format.

## How to Run Locally

This application is a Next.js project. To run it locally, ensure you have Node.js (version 18 or higher recommended) and a package manager (npm or pnpm) installed.

1.  **Navigate to the project directory:**
    ```bash
    cd C:\Users\Muugi\Desktop\LiveShopManager
    ```
2.  **Install dependencies:**
    If using npm:
    ```bash
    npm install
    ```
    If using pnpm:
    ```bash
    pnpm install
    ```
3.  **Start the development server:**
    ```bash
    npm run dev
    # or pnpm dev
    ```
4.  Open your browser and navigate to `http://localhost:3000` (or the port indicated in your terminal).

## 5-Minute Seller Demo Steps

Follow these steps for a quick demonstration of the core workflow:

1.  **Ensure "A12" is the Active Product:** On the demo interface, make sure the product with code "A12" (Даашинз - Dress) is marked as active. If not, click the "Active болгох" button next to it.
2.  **Paste Comments:** In the "Коммент наах" (Paste Comments) section, use the following example:
    ```
    Болор: A12 хар M авъя
    Сараа: A12 улаан L 2ш
    Номин: C01 цагаан 38 авъя
    ```
3.  **Generate Orders:** Click the "Захиалга үүсгэх" (Generate Orders) button. You will see new pending orders appear.
4.  **Paste Payment Event:** In the "Төлбөр наах" (Paste Payment) section, use the following example (this value corresponds to the total for the previous orders):
    ```
    239000 Болор 99112233
    ```
5.  **Process Payment:** Click the "Төлбөр шалгах" (Check Payment) button. The pending orders will now be marked as "Paid".
6.  **Verify Packing List:** In the "Packing List / Paid orders" section, you will see the A12 and C01 orders listed.
7.  **Export CSV:** Click the "CSV татах" (Download CSV) button to generate a packing list for the paid orders.

*(Optional: Try adding products, making mistakes in comments, or pasting multiple payments to see how the system handles it.)*

## Current Demo Limitations

*   **Demo Only:** This is a proof-of-concept demonstration, not a production-ready application.
*   **Manual Facebook Comment Paste:** Customer comments must be manually copied and pasted into the system. There is no direct integration with Facebook Live comments.
*   **QPay Simulated:** The QPay payment matching is simulated using text input; it does not connect to a real QPay gateway.
*   **Client-side Timer:** The order expiration timer runs client-side within the browser.
*   **All Data Saved in Browser LocalStorage:** All product, order, and event data is stored exclusively in the browser's local storage. There is no backend database.

## Pricing Hypothesis

This demo illustrates potential service tiers for a Live Sales Assistant product:

*   **Basic (99,000₮ / month):**
    *   Manual "Mark Paid" button.
    *   Basic Stock Management.
    *   CSV Packing List export.

*   **Auto (149,000₮ / month + 1% transaction fee):**
    *   **Automated Payment Matching (QPay simulation used in demo).**
    *   All features from Basic plan.
    *   Future updates and new features.

## Next Roadmap

Future improvements would focus on transforming this demo into a production-ready solution:

1.  **Backend Integration:** Implement a robust backend for persistent data storage (products, orders, payments) and user authentication.
2.  **Live Comment Integration:** Develop real-time integration with live streaming platforms (e.g., Facebook Live, TikTok Live) to automatically ingest comments.
3.  **Real Payment Gateway Integration:** Integrate with actual payment gateways (e.g., QPay, Stripe) for automatic payment matching and processing.
4.  **Enhanced User Interface:** Build a more comprehensive dashboard for sellers to manage products, view analytics, and monitor live sales.
5.  **Notifications:** Implement real-time notifications for new orders, successful payments, and stock alerts.