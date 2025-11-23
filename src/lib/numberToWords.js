export function numberToWords(amount) {
    const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const double = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convert(num) {
        if (num < 10) return single[num];
        if (num >= 10 && num < 20) return double[num - 10];
        if (num >= 20 && num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + single[num % 10] : "");
        if (num >= 100 && num < 1000) return single[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + convert(num % 100) : "");
        if (num >= 1000 && num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + convert(num % 1000) : "");
        if (num >= 100000 && num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + convert(num % 100000) : "");
        if (num >= 10000000) return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 !== 0 ? " " + convert(num % 10000000) : "");
        return "";
    }

    const [integerPart, decimalPart] = amount.toString().split(".");
    let words = convert(parseInt(integerPart));

    if (decimalPart && parseInt(decimalPart) > 0) {
        // Handle decimal part (paise)
        // Assuming 2 decimal places usually
        const paise = parseInt(decimalPart.padEnd(2, '0').substring(0, 2));
        if (paise > 0) {
            words += " and " + convert(paise) + " Paise";
        }
    }

    return "INR " + words + " Only";
}
