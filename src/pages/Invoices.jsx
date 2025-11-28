import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where, limit } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";

export default function Invoices() {
    const { currentUser } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        // Only fetch Tax Invoices - limit to 50 most recent for performance
        // Note: orderBy removed temporarily to avoid index requirement
        const q = query(
            collection(db, "users", currentUser.uid, "invoices"),
            where("documentType", "==", "Tax Invoice"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side by date (newest first)
            invoicesData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setInvoices(invoicesData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this invoice?")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "invoices", id));
            } catch (err) {
                console.error("Error deleting invoice:", err);
            }
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Tax Invoices</h2>
                <Link to="/invoices/new">
                    <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New Tax Invoice</Button>
                </Link>
            </div>

            <div className="rounded-md border overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center">No invoices found</TableCell></TableRow>
                            ) : (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                                        <TableCell>{invoice.date ? format(new Date(invoice.date), "dd/MM/yyyy") : "N/A"}</TableCell>
                                        <TableCell>{invoice.buyerDetails?.name || "N/A"}</TableCell>
                                        <TableCell>₹{invoice.grandTotal?.toFixed(2)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link to={`/invoices/${invoice.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link to={`/invoices/${invoice.id}/print`}>
                                                <Button variant="ghost" size="icon">
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(invoice.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4 p-4 bg-muted/20">
                    {loading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No invoices found</div>
                    ) : (
                        invoices.map((invoice) => (
                            <div key={invoice.id} className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-lg">{invoice.invoiceNo}</div>
                                        <div className="text-sm text-muted-foreground">{invoice.date ? format(new Date(invoice.date), "dd MMM yyyy") : "N/A"}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">₹{invoice.grandTotal?.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">Total Amount</div>
                                    </div>
                                </div>

                                <div className="text-sm border-t pt-2 mt-2">
                                    <div className="font-medium">Buyer:</div>
                                    <div className="text-muted-foreground">{invoice.buyerDetails?.name || "N/A"}</div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <Link to={`/invoices/${invoice.id}`}>
                                        <Button variant="outline" size="sm" className="h-8">
                                            <Eye className="h-3 w-3 mr-2" />
                                            View
                                        </Button>
                                    </Link>
                                    <Link to={`/invoices/${invoice.id}/print`}>
                                        <Button variant="outline" size="sm" className="h-8">
                                            <Printer className="h-3 w-3 mr-2" />
                                            Print
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="sm" className="h-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(invoice.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
