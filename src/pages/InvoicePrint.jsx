import { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import { Download } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { numberToWords } from "@/lib/numberToWords";
import { format } from "date-fns";

export default function InvoicePrint() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const pdfRef = useRef();

    useEffect(() => {
        if (!currentUser || !id) return;
        const fetchInvoice = async () => {
            const docSnap = await getDoc(doc(db, "users", currentUser.uid, "invoices", id));
            if (docSnap.exists()) {
                setInvoice(docSnap.data());
            }
            setLoading(false);
        };
        fetchInvoice();
    }, [currentUser, id]);

    useEffect(() => {
        if (!loading && invoice) {
            document.title = invoice.invoiceNo; // Set title for print filename
        }
    }, [loading, invoice]);



    const handleDownloadPDF = () => {
        const element = pdfRef.current;
        const opt = {
            margin: 0,
            filename: `${invoice.invoiceNo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (loading) return <div>Loading...</div>;
    if (!invoice) return <div>Invoice not found</div>;

    const company = currentUser.profile.companyProfile;
    const buyer = invoice.buyerDetails;
    const consignee = invoice.consigneeDetails;

    // Tax Logic
    const companyStateCode = company.stateCode;
    const buyerStateCode = buyer?.state ? buyer.state : "";

    const isIntraState = (company.stateCode && buyer.stateCode && company.stateCode === buyer.stateCode) ||
        (company.stateCode && buyer.state && company.stateCode.toLowerCase() === buyer.state.toLowerCase()) ||
        (company.address && buyer.address && company.address.toLowerCase().includes(buyer.address.toLowerCase()));

    const isIGST = !isIntraState;

    const freightCharges = parseFloat(invoice.freightCharges || 0);
    let totalQty = 0;
    let totalTaxable = 0;

    const itemsWithTax = invoice.items.map(item => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const amount = qty * rate;

        totalQty += qty;
        totalTaxable += amount; // This is actually Item Subtotal now

        return {
            ...item,
            amount,
        };
    });

    const subTotal = totalTaxable;
    const taxableValue = subTotal + freightCharges;
    const totalTaxAmount = taxableValue * 0.18;
    const totalAmountBeforeRoundoff = taxableValue + totalTaxAmount;
    const grandTotal = Math.round(totalAmountBeforeRoundoff);
    const roundOffAmount = grandTotal - totalAmountBeforeRoundoff;

    const taxWordAmount = Math.round(totalTaxAmount);
    const grandTotalWordAmount = grandTotal;

    // Get document type and determine appropriate labels
    const documentType = invoice.documentType || "Tax Invoice";
    const documentTitle = documentType;

    // Determine copy text based on document type
    const getCopyText = (copyNumber) => {
        if (documentType === "Quotation") {
            return copyNumber === 1 ? "ORIGINAL FOR CUSTOMER" : "DUPLICATE FOR SUPPLIER";
        } else {
            return copyNumber === 1 ? "ORIGINAL FOR RECIPIENT" : "DUPLICATE FOR TRANSPORTER";
        }
    };

    const renderInvoice = (copyNumber) => (
        <div className="a4-page">
            <div className="invoice-border-box">
                <div className="header-title">
                    <span style={{ flex: 1 }}>{documentTitle}</span>
                    <span style={{ fontWeight: 'normal', fontStyle: 'italic', fontSize: '8pt' }}>({getCopyText(copyNumber)})</span>
                </div>

                <div className="row">
                    <div className="col w-50" style={{ padding: 0 }}>
                        <div style={{ padding: '4px 4px 6px 4px', borderBottom: '1px solid black', fontSize: '8pt' }}>
                            <div className="bold" style={{ fontSize: '10pt' }}>{company.companyName}</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{company.address}</div>
                            <div>GSTIN/UIN: <span className="bold">{company.gstin}</span></div>
                            <div>State Name : <span className="bold">{company.state}</span>, Code : <span className="bold">{company.stateCode}</span></div>
                        </div>
                        <div style={{ padding: '4px 4px 6px 4px', borderBottom: '1px solid black', fontSize: '8pt' }}>
                            <div className="small">Consignee (Ship to)</div>
                            <div className="bold">{consignee?.name}</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{consignee?.shippingAddress || consignee?.address}</div>
                            <div>GSTIN/UIN : <span className="bold">{consignee?.gstin}</span></div>
                            <div>State Name : <span className="bold">{consignee?.state}</span>, Code : <span className="bold">{consignee?.stateCode}</span></div>
                        </div>
                        <div style={{ padding: '4px 4px 6px 4px', fontSize: '8pt' }}>
                            <div className="small">Buyer (Bill to)</div>
                            <div className="bold">{buyer?.name}</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{buyer?.address}</div>
                            <div>GSTIN/UIN : <span className="bold">{buyer?.gstin}</span></div>
                            <div>State Name : <span className="bold">{buyer?.state}</span>, Code : <span className="bold">{buyer?.stateCode}</span></div>
                        </div>
                    </div>
                    <div className="col w-50" style={{ padding: 0, fontSize: '8pt' }}>
                        <div className="sub-grid">
                            <div><div className="small">Invoice No.</div><div className="bold">{invoice.invoiceNo}</div></div>
                            <div><div className="small">Dated</div><div className="bold">{format(new Date(invoice.date), "dd-MMM-yy")}</div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">e-Way Bill No.</div><div className="bold">{invoice.eWayBillNo}</div></div>
                            <div><div className="small">Mode/Terms of Payment</div><div>{invoice.modeOfPayment}</div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Reference No. & Date.</div><div className="bold">{invoice.invoiceNo} / {format(new Date(invoice.date), "dd-MMM-yy")}</div></div>
                            <div><div className="small">Other References</div><div></div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Buyer's Order No.</div><div></div></div>
                            <div><div className="small">Dated</div><div></div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Dispatch Doc No.</div><div>{invoice.dispatchDocNo}</div></div>
                            <div><div className="small">Delivery Note Date</div><div></div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Vehicle Number</div><div className="bold">{invoice.vehicleNo}</div></div>
                            <div><div className="small">Destination</div><div></div></div>
                        </div>
                        <div style={{ padding: '2px', height: 'auto', minHeight: '40px' }}>
                            <div className="small">
                                {documentType === "Proforma Invoice" || documentType === "Quotation"
                                    ? "Terms and Conditions"
                                    : "Terms of Delivery"}
                            </div>
                            <div style={{ fontSize: '7pt', lineHeight: '1.4' }}>
                                {documentType === "Proforma Invoice" || documentType === "Quotation" ? (
                                    invoice.termsOfDelivery ||
                                    "1. 50% advance payment required to confirm the order and remaining 50% before dispatch\n2. Delivery period: 20-30 working days from receipt of advance payment\n3. Delivery charges extra as per actual"
                                ) : (
                                    invoice.termsOfDelivery
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <table className="items-table" style={{ height: '100%' }}>
                        <thead>
                            <tr>
                                <th width="4%">Sl<br />No.</th>
                                <th width="50%">Description of Goods</th>
                                <th width="10%">HSN/SAC</th>
                                <th width="8%">Quantity</th>
                                <th width="9%">Rate</th>
                                <th width="5%">per</th>
                                <th width="14%">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsWithTax.map((item, index) => (
                                <tr key={index}>
                                    <td className="text-center">{index + 1}</td>
                                    <td>
                                        <div className="bold">{item.description}</div>
                                    </td>
                                    <td className="text-center">{item.hsnCode}</td>
                                    <td className="bold text-center">{item.qty} {item.per}</td>
                                    <td className="text-right">{item.rate}</td>
                                    <td className="text-center">{item.per}</td>
                                    <td className="text-right bold">
                                        <div>{item.amount.toFixed(2)}</div>
                                    </td>
                                </tr>
                            ))}

                            {/* Spacer row to push summary to bottom */}
                            <tr style={{ height: '100%' }}>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: 'none' }}></td>
                            </tr>

                            {/* Cartage Charges */}
                            {freightCharges > 0 && (
                                <tr>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>CARTAGE CHARGES</td>
                                    <td className="text-center" style={{ borderRight: '1px solid black' }}>9965</td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold">{freightCharges.toFixed(2)}</td>
                                </tr>
                            )}

                            {/* Tax Rows */}
                            {isIGST ? (
                                <tr>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Output Igst</td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold">{totalTaxAmount.toFixed(2)}</td>
                                </tr>
                            ) : (
                                <>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Output Cgst</td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold">{(totalTaxAmount / 2).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Output Sgst</td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold">{(totalTaxAmount / 2).toFixed(2)}</td>
                                    </tr>
                                </>
                            )}

                            {/* Roundoff */}
                            <tr>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Roundoff</td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="text-right bold">{roundOffAmount.toFixed(2)}</td>
                            </tr>

                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '1px solid black', borderBottom: '1px solid black', height: '30px' }}>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="text-right bold" style={{ borderRight: '1px solid black' }}>Total</td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="bold text-center" style={{ borderRight: '1px solid black' }}>{totalQty} Pcs</td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="bold text-right">₹ {grandTotal.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div>
                    <div style={{ padding: '4px', borderBottom: '1px solid black' }}>
                        <div className="small">
                            Amount Chargeable (in words)
                            <span style={{ float: 'right', fontStyle: 'italic' }}>E. & O.E</span>
                        </div>
                        <div className="bold italic">
                            {numberToWords(grandTotalWordAmount)}
                        </div>
                    </div>

                    <div style={{ padding: '0' }}>
                        <table className="tax-analysis-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">HSN/SAC</th>
                                    <th rowSpan="2">Taxable<br />Value</th>
                                    {isIGST ? (
                                        <th colSpan="2">Integrated Tax</th>
                                    ) : (
                                        <>
                                            <th colSpan="2">Central Tax</th>
                                            <th colSpan="2">State Tax</th>
                                        </>
                                    )}
                                    <th rowSpan="2">Total<br />Tax Amount</th>
                                </tr>
                                <tr>
                                    {isIGST ? (
                                        <><th>Rate</th><th>Amount</th></>
                                    ) : (
                                        <><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-center">All Items</td>
                                    <td className="text-right">{taxableValue.toFixed(2)}</td>
                                    {isIGST ? (
                                        <>
                                            <td className="text-right">18%</td>
                                            <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="text-right">9%</td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                            <td className="text-right">9%</td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                </tr>
                                <tr className="bold">
                                    <td className="text-right">Total</td>
                                    <td className="text-right">{taxableValue.toFixed(2)}</td>
                                    {isIGST ? (
                                        <>
                                            <td></td>
                                            <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td></td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                            <td></td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: '4px', borderBottom: '1px solid black' }}>
                        <div className="small">
                            Tax Amount (in words) : <span className="bold">{numberToWords(taxWordAmount)}</span>
                        </div>
                    </div>

                    <div className="row" style={{ borderBottom: 'none', minHeight: '100px' }}>
                        <div className="col w-50" style={{ borderRight: '1px solid black', padding: '4px' }}>
                            <div className="small" style={{ textDecoration: 'underline' }}>Declaration</div>
                            <div className="small">
                                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                            </div>
                        </div>
                        <div className="col w-50" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px' }}>
                            <div className="small text-right bold">For {company.companyName}</div>
                            <br /><br />
                            <div className="small text-right">Authorised Signatory</div>
                        </div>
                    </div>
                </div>
            </div >
            <div className="text-center small mt-1">This is a Computer Generated Invoice</div>
        </div >
    );

    return (
        <div className="bg-white text-black p-0 m-0 text-[10pt] font-sans leading-tight">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Arimo:wght@400;700&display=swap');
                


                .a4-page {
                    width: 210mm;
                    height: 296mm;
                    background: white;
                    color: #000;
                    font-family: 'Arimo', sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    box-sizing: border-box;
                    padding: 5mm;
                    margin: 0 auto;
                    position: relative;
                    page-break-after: always;
                }

                .a4-page:last-child {
                    page-break-after: always; /* Ensure even the last page has a break if needed, or auto if it's the very end */
                }
                
                /* Specific fix for the last page to not create an empty 3rd page if not needed, 
                   but usually 'always' on the first one is enough. 
                   Let's keep the logic: First invoice -> break. Second invoice -> no break needed after it.
                */
                .a4-page:last-child {
                    page-break-after: auto;
                }

                .invoice-border-box { border: 1px solid #000; display: flex; flex-direction: column; height: 282mm; }
                .row { display: flex; border-bottom: 1px solid #000; }
                .col { padding: 4px; border-right: 1px solid #000; }
                .col:last-child { border-right: none; }
                .row:last-child { border-bottom: none; }
                
                .header-title { text-align: center; font-weight: bold; padding: 5px; border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 9pt; }
                
                .bold { font-weight: 700; }
                .small { font-size: 7pt; color: #333; margin-bottom: 2px; }
                .w-50 { width: 50%; }
                
                .sub-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000; }
                .sub-grid > div { padding: 3px 4px 5px 4px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center; min-height: 32px; }
                .sub-grid > div:last-child { border-right: none; }
                
                .items-table { width: 100%; border-collapse: collapse; height: 100%; }
                .items-table th { border-bottom: 1px solid #000; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: 8pt; padding: 4px; background: #f0f0f0; }
                .items-table td { border-right: 1px solid #000; padding: 4px; vertical-align: top; font-size: 9pt; }
                .items-table td:last-child, .items-table th:last-child { border-right: none; }
                
                .tax-analysis-table { width: 100%; border-collapse: collapse; }
                .tax-analysis-table th, .tax-analysis-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 8pt; }
                .tax-analysis-table th { background: #f0f0f0; }
                
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .tax-row { font-style: italic; font-weight: bold; font-size: 8pt; }
            `}</style>

            <div className="no-print fixed top-0 left-0 right-0 bg-card text-card-foreground border-b border-border p-4 flex justify-between items-center z-50">
                <div className="font-bold text-lg">Invoice Preview</div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded">
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            </div>

            <div className="pt-20 bg-muted min-h-screen flex flex-col items-center gap-8 pb-8">
                <div ref={pdfRef}>
                    {renderInvoice(1)}
                    {renderInvoice(2)}
                </div>
            </div>
        </div >
    );
}
