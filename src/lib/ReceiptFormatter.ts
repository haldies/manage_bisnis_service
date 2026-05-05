import { StoreProfile, ReceiptSettings, ServiceReceiptSettings, Transaction, ServiceTicket } from './types';

const ESC = '\x1B';
const GS  = '\x1D';
const LF  = '\x0A';

export const COMMANDS = {
    RESET:            `${ESC}@`,
    ALIGN_LEFT:       `${ESC}a\x00`,
    ALIGN_CENTER:     `${ESC}a\x01`,
    ALIGN_RIGHT:      `${ESC}a\x02`,
    BOLD_ON:          `${ESC}E\x01`,
    BOLD_OFF:         `${ESC}E\x00`,
    FONT_SIZE_NORMAL: `${GS}!\x00`,
    FONT_SIZE_DOUBLE: `${GS}!\x11`,
    CUT:              `${GS}V\x41\x00`,
    CUT_PARTIAL:      `${GS}V\x42\x00`,
    CHARSET_PC437:    `${ESC}t\x00`,
};

export const BARCODE_COMMANDS = {
    HEIGHT:    (h: number) => `${GS}h${String.fromCharCode(h)}`,
    WIDTH:     (w: number) => `${GS}w${String.fromCharCode(w)}`,
    HRI_BELOW: `${GS}H\x02`,
    CODE128:   (data: string) => {
        const subsetB = `{B${data}`;
        return `${GS}k\x49${String.fromCharCode(subsetB.length)}${subsetB}`;
    },
};

const PAPER_CHAR_WIDTH: Record<string, number> = {
    '58mm':         32,
    '58mm-on-80mm': 32,
    '80mm':         48,
};

function centerText(text: string, width: number): string {
    const t = text.trim();
    if (!t) return '';
    if (t.length >= width) return t.substring(0, width);
    const pad = Math.floor((width - t.length) / 2);
    return ' '.repeat(pad) + t;
}

function wordWrap(text: string, width: number): string[] {
    if (!text) return [''];
    const words  = text.split(' ');
    const lines: string[] = [];
    let   curr   = '';

    for (const word of words) {
        if (word.length > width) {
            if (curr) { lines.push(curr); curr = ''; }
            let rem = word;
            while (rem.length > width) {
                lines.push(rem.substring(0, width));
                rem = rem.substring(width);
            }
            curr = rem;
        } else if (!curr) {
            curr = word;
        } else if (curr.length + 1 + word.length <= width) {
            curr += ' ' + word;
        } else {
            lines.push(curr);
            curr = word;
        }
    }
    if (curr) lines.push(curr);
    return lines;
}

function buildTwoCol(left: string, right: string, width: number): string[] {
    const gap = width - left.length - right.length;
    if (gap >= 1) {
        return [`${left}${' '.repeat(gap)}${right}`];
    } else if (gap === 0) {
        return [`${left}${right}`];
    } else {
        return [
            left,
            ' '.repeat(Math.max(0, width - right.length)) + right,
        ];
    }
}

function fmtRp(amount: number): string {
    const str = Math.round(Math.abs(amount)).toString();
    let   out = '';
    for (let i = str.length - 1, n = 0; i >= 0; i--, n++) {
        if (n > 0 && n % 3 === 0) out = '.' + out;
        out = str[i] + out;
    }
    return out;
}

function fmtDate(date: string | number | Date): string {
    const d   = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = ['Jan','Feb','Mar','Apr','Mei','Jun',
                 'Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
    return `${day} ${mon} ${d.getFullYear()}`;
}

function fmtDateTime(date: string | number | Date): string {
    const d  = new Date(date);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${fmtDate(d)} ${hh}:${mm}`;
}

class ReceiptBuilder {
    private buf = '';
    private readonly lm: string;

    constructor(leftMargin = '') {
        this.lm   = leftMargin;
        this.buf += COMMANDS.RESET + COMMANDS.CHARSET_PC437 + COMMANDS.ALIGN_LEFT;
    }

    cmd(s: string): this { this.buf += s; return this; }
    raw(s: string): this { this.buf += s; return this; }

    line(text: string, prefix = '', suffix = ''): this {
        this.buf += this.lm + prefix + text + suffix + LF;
        return this;
    }

    blank(): this { this.buf += this.lm + LF; return this; }

    rule(width: number, ch = '-'): this { return this.line(ch.repeat(width)); }

    center(text: string, width: number, bold = false): this {
        const ct = centerText(text, width);
        return bold
            ? this.line(ct, COMMANDS.BOLD_ON, COMMANDS.BOLD_OFF)
            : this.line(ct);
    }

    colLine(
        left: string, right: string, width: number,
        boldLeft = false, boldRight = false,
    ): this {
        const rows = buildTwoCol(left, right, width);

        if (rows.length === 1) {
            const gap   = width - left.length - right.length;
            const space = ' '.repeat(Math.max(0, gap));
            this.buf += this.lm
                + (boldLeft  ? COMMANDS.BOLD_ON : '')
                + left
                + (boldLeft  ? COMMANDS.BOLD_OFF : '')
                + space
                + (boldRight ? COMMANDS.BOLD_ON : '')
                + right
                + (boldRight ? COMMANDS.BOLD_OFF : '')
                + LF;
        } else {
            this.line(rows[0], boldLeft ? COMMANDS.BOLD_ON : '', boldLeft ? COMMANDS.BOLD_OFF : '');
            const rLine = rows[1];
            this.line(rLine, boldRight ? COMMANDS.BOLD_ON : '', boldRight ? COMMANDS.BOLD_OFF : '');
        }
        return this;
    }

    totalLine(left: string, right: string, width: number): this {
        return this.colLine(left, right, width, true, true);
    }

    build(): string { return this.buf; }
}

export class ReceiptFormatter {
    private static width(s: ReceiptSettings): number {
        return PAPER_CHAR_WIDTH[s.paperWidth] ?? 48;
    }

    private static margin(s: ReceiptSettings): string {
        return s.paperWidth === '58mm-on-80mm' ? ' '.repeat(16) : '';
    }

    static formatReceipt(
        transaction: Transaction,
        store: StoreProfile,
        settings: ReceiptSettings,
    ): string {
        const w = this.width(settings);
        const r = new ReceiptBuilder(this.margin(settings));

        r.center(store.name.toUpperCase(), w, true);

        if (settings.showStoreAddress && store.address) {
            wordWrap(store.address, w).forEach(l => r.center(l, w));
        }
        if (settings.showStorePhone && store.phone) {
            r.center(store.phone, w);
        }
        r.blank();

        r.colLine(fmtDate(transaction.date), `#${transaction.id}`, w);

        if (settings.showCustomerName && transaction.customerName) {
            r.line(`Pelanggan: ${transaction.customerName}`);
        }
        if (settings.showQueueNumber !== false && transaction.queueNumber) {
            r.line(`Antrian  : ${transaction.queueNumber}`);
        }
        if (settings.showCashierName && transaction.cashierName) {
            r.line(`Kasir    : ${transaction.cashierName}`);
        }
        r.rule(w);
 
        transaction.items.forEach((item: any) => {
            wordWrap(item.name, w).forEach(l => r.line(l));

            const qtyPart   = `  ${item.quantity}${item.unit ? ' ' + item.unit : ''} x @Rp${fmtRp(item.price)}`;
            const totalPart = `Rp ${fmtRp(item.quantity * item.price)}`;
            r.colLine(qtyPart, totalPart, w);
            
            if (item.warranty) {
                r.line(`  Garansi: ${item.warranty}`);
            }

            if (settings.showDiscount && item.discount && item.discount > 0) {
                r.colLine('  Diskon', `-Rp ${fmtRp(item.discount * item.quantity)}`, w);
            }
        });
        r.rule(w);

        const subtotal = transaction.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
        r.colLine('Subtotal', fmtRp(subtotal), w);

        if (settings.showTax && transaction.tax && transaction.tax > 0) {
            r.colLine('Pajak', fmtRp(transaction.tax), w);
        }
        if (transaction.discount && transaction.discount > 0) {
            r.colLine('Diskon', `-${fmtRp(transaction.discount)}`, w);
        }

        r.rule(w);
        r.totalLine('TOTAL', `Rp ${fmtRp(transaction.total)}`, w);
        r.rule(w);

        if (transaction.paymentMethod === 'Cash') {
            r.colLine('Tunai', `Rp ${fmtRp(transaction.amountPaid ?? 0)}`, w);
            r.colLine('Kembali', `Rp ${fmtRp(transaction.change ?? 0)}`, w);
        } else {
            r.line(`Metode: ${transaction.paymentMethod}`);
        }
        r.blank();

        const footer = settings.receiptFooter || 'Terima Kasih!';
        wordWrap(footer, w).forEach(l => r.center(l.trim(), w));

        r.cmd(LF + LF + LF + COMMANDS.CUT);

        return r.build();
    }

    static formatReceiptPlain(
        transaction: Transaction,
        store: StoreProfile,
        settings: ReceiptSettings,
    ): string {
        const w      = this.width(settings);
        const margin = this.margin(settings);
        const lines: string[] = [];

        const add  = (t = '') => lines.push(margin + t);
        const rule = ()       => add('-'.repeat(w));

        add(centerText(store.name.toUpperCase(), w));
        if (settings.showStoreAddress && store.address) {
            wordWrap(store.address, w).forEach(l => add(centerText(l, w)));
        }
        if (settings.showStorePhone && store.phone) add(centerText(store.phone, w));
        add();

        buildTwoCol(fmtDate(transaction.date), `#${transaction.id}`, w)
            .forEach(l => add(l));

        if (settings.showCustomerName && transaction.customerName) add(`Pelanggan: ${transaction.customerName}`);
        if (settings.showQueueNumber !== false && transaction.queueNumber) add(`Antrian  : ${transaction.queueNumber}`);
        if (settings.showCashierName && transaction.cashierName) add(`Kasir    : ${transaction.cashierName}`);
        rule();

        transaction.items.forEach((item: any) => {
            wordWrap(item.name, w).forEach(l => add(l));
            buildTwoCol(
                `  ${item.quantity}${item.unit ? ' ' + item.unit : ''} x @Rp${fmtRp(item.price)}`,
                `Rp ${fmtRp(item.quantity * item.price)}`,
                w,
            ).forEach(l => add(l));

            if (item.warranty) {
                add(`  Garansi: ${item.warranty}`);
            }

            if (settings.showDiscount && item.discount && item.discount > 0) {
                buildTwoCol('  Diskon', `-Rp ${fmtRp(item.discount * item.quantity)}`, w)
                    .forEach(l => add(l));
            }
        });
        rule();

        const subtotal = transaction.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
        buildTwoCol('Subtotal', fmtRp(subtotal), w).forEach(l => add(l));

        if (settings.showTax && transaction.tax && transaction.tax > 0) {
            buildTwoCol('Pajak', fmtRp(transaction.tax), w).forEach(l => add(l));
        }
        if (transaction.discount && transaction.discount > 0) {
            buildTwoCol('Diskon', `-${fmtRp(transaction.discount)}`, w).forEach(l => add(l));
        }
        rule();
        buildTwoCol('TOTAL', `Rp ${fmtRp(transaction.total)}`, w).forEach(l => add(l));
        rule();

        if (transaction.paymentMethod === 'Cash') {
            buildTwoCol('Tunai', `Rp ${fmtRp(transaction.amountPaid ?? 0)}`, w).forEach(l => add(l));
            buildTwoCol('Kembali', `Rp ${fmtRp(transaction.change ?? 0)}`, w).forEach(l => add(l));
        } else {
            add(`Metode: ${transaction.paymentMethod}`);
        }
        add();

        const footer = settings.receiptFooter || 'Terima Kasih!';
        wordWrap(footer, w).forEach(l => add(centerText(l.trim(), w)));

        return lines.join(LF) + LF;
    }

    // ── Service: Tanda Terima Masuk ──────────────────────────────────────────
    static formatServiceIntakeReceipt(
        ticket: ServiceTicket,
        store: StoreProfile,
        settings: ServiceReceiptSettings,
        technicianName?: string,
    ): string {
        const w = PAPER_CHAR_WIDTH[settings.paperWidth] ?? 32;
        const margin = settings.paperWidth === '58mm-on-80mm' ? ' '.repeat(16) : '';
        const r = new ReceiptBuilder(margin);

        r.center(store.name.toUpperCase(), w, true);
        r.center('TANDA TERIMA SERVIS', w);
        if (store.address) wordWrap(store.address, w).forEach(l => r.center(l, w));
        if (store.phone) r.center(store.phone, w);
        r.rule(w);

        r.colLine('Tgl Masuk', fmtDateTime(ticket.dateOpened), w);
        r.colLine('No Tiket', `#${ticket.id.slice(-8).toUpperCase()}`, w);
        r.rule(w);

        r.line('PELANGGAN:', COMMANDS.BOLD_ON, COMMANDS.BOLD_OFF);
        r.line(`  ${ticket.customerName}`);
        if (settings.showIntakeCustomerPhone && ticket.customerPhone) {
            r.line(`  ${ticket.customerPhone}`);
        }
        r.blank();

        r.line('PERANGKAT:', COMMANDS.BOLD_ON, COMMANDS.BOLD_OFF);
        r.line(`  ${ticket.deviceModel}`);
        if (settings.showIntakeDeviceSerial && ticket.deviceSerial) {
            r.line(`  SN: ${ticket.deviceSerial}`);
        }
        r.blank();

        r.line('KELUHAN:', COMMANDS.BOLD_ON, COMMANDS.BOLD_OFF);
        wordWrap(ticket.issue, w - 2).forEach(l => r.line(`  ${l}`));

        if (technicianName) {
            r.blank();
            r.colLine('Teknisi', technicianName, w);
        }

        if (settings.showIntakeEstimatedCost && ticket.estimatedCost > 0) {
            r.blank();
            r.colLine('Est. Biaya', `Rp ${fmtRp(ticket.estimatedCost)}`, w);
        }

        if (settings.showIntakePickupCode && ticket.pickupCode) {
            r.rule(w);
            r.center('KODE AMBIL', w);
            r.cmd(COMMANDS.ALIGN_LEFT + COMMANDS.FONT_SIZE_DOUBLE + COMMANDS.BOLD_ON);
            r.raw(margin + centerText(ticket.pickupCode, Math.floor(w / 2)) + LF);
            r.cmd(COMMANDS.BOLD_OFF + COMMANDS.FONT_SIZE_NORMAL);
        }

        r.rule(w);
        const footer = settings.intakeFooter || 'Simpan struk ini untuk pengambilan unit.';
        wordWrap(footer, w).forEach(l => r.center(l.trim(), w));
        r.cmd(LF + LF + LF + COMMANDS.CUT);

        return r.build();
    }

    static formatServiceIntakePlain(
        ticket: ServiceTicket,
        store: StoreProfile,
        settings: ServiceReceiptSettings,
        technicianName?: string,
    ): string {
        const w = PAPER_CHAR_WIDTH[settings.paperWidth] ?? 32;
        const margin = settings.paperWidth === '58mm-on-80mm' ? ' '.repeat(16) : '';
        const lines: string[] = [];
        const add = (t = '') => lines.push(margin + t);
        const rule = () => add('-'.repeat(w));

        add(centerText(store.name.toUpperCase(), w));
        add(centerText('TANDA TERIMA SERVIS', w));
        if (store.address) wordWrap(store.address, w).forEach(l => add(centerText(l, w)));
        if (store.phone) add(centerText(store.phone, w));
        rule();

        buildTwoCol('Tgl Masuk', fmtDateTime(ticket.dateOpened), w).forEach(l => add(l));
        buildTwoCol('No Tiket', `#${ticket.id.slice(-8).toUpperCase()}`, w).forEach(l => add(l));
        rule();

        add('PELANGGAN:');
        add(`  ${ticket.customerName}`);
        if (settings.showIntakeCustomerPhone && ticket.customerPhone) add(`  ${ticket.customerPhone}`);
        add();

        add('PERANGKAT:');
        add(`  ${ticket.deviceModel}`);
        if (settings.showIntakeDeviceSerial && ticket.deviceSerial) add(`  SN: ${ticket.deviceSerial}`);
        add();

        add('KELUHAN:');
        wordWrap(ticket.issue, w - 2).forEach(l => add(`  ${l}`));

        if (technicianName) { add(); buildTwoCol('Teknisi', technicianName, w).forEach(l => add(l)); }
        if (settings.showIntakeEstimatedCost && ticket.estimatedCost > 0) {
            add(); buildTwoCol('Est. Biaya', `Rp ${fmtRp(ticket.estimatedCost)}`, w).forEach(l => add(l));
        }
        if (settings.showIntakePickupCode && ticket.pickupCode) {
            rule(); add(centerText('KODE AMBIL', w)); add(centerText(ticket.pickupCode, w));
        }

        rule();
        const footer = settings.intakeFooter || 'Simpan struk ini untuk pengambilan unit.';
        wordWrap(footer, w).forEach(l => add(centerText(l.trim(), w)));

        return lines.join(LF) + LF;
    }

    // ── Service: Nota Selesai / Invoice ──────────────────────────────────────
    static formatServiceInvoice(
        ticket: ServiceTicket,
        store: StoreProfile,
        settings: ServiceReceiptSettings,
        technicianName?: string,
    ): string {
        const w = PAPER_CHAR_WIDTH[settings.paperWidth] ?? 32;
        const margin = settings.paperWidth === '58mm-on-80mm' ? ' '.repeat(16) : '';
        const r = new ReceiptBuilder(margin);

        r.center(store.name.toUpperCase(), w, true);
        r.center('NOTA SERVIS', w);
        if (store.address) wordWrap(store.address, w).forEach(l => r.center(l, w));
        if (store.phone) r.center(store.phone, w);
        r.rule(w);

        r.colLine('Tgl Selesai', fmtDateTime(ticket.dateClosed ?? Date.now()), w);
        r.colLine('No Tiket', `#${ticket.id.slice(-8).toUpperCase()}`, w);
        r.rule(w);

        r.line(`Pelanggan : ${ticket.customerName}`);
        r.line(`Perangkat : ${ticket.deviceModel}`);
        if (settings.showInvoiceTechnician && technicianName) {
            r.line(`Teknisi   : ${technicianName}`);
        }
        r.rule(w);

        // Spareparts
        if (settings.showInvoiceSpareparts && ticket.spareparts?.length > 0) {
            r.line('SPAREPART:', COMMANDS.BOLD_ON, COMMANDS.BOLD_OFF);
            ticket.spareparts.forEach((p: any) => {
                const name = p.name || 'Item';
                const qty = p.quantity || 1;
                const price = Number(p.price) || 0;
                wordWrap(name, w).forEach(l => r.line(l));
                r.colLine(`  ${qty}x @Rp${fmtRp(price)}`, `Rp ${fmtRp(qty * price)}`, w);
            });
        }

        // Service fee
        if (settings.showInvoiceServiceFee) {
            r.colLine('Jasa Servis', `Rp ${fmtRp(ticket.serviceFee || 0)}`, w);
        }

        r.rule(w);
        const total = (ticket.spareparts?.reduce((s: number, p: any) => s + (Number(p.price) || 0) * (p.quantity || 1), 0) || 0) + (ticket.serviceFee || 0);
        r.totalLine('TOTAL', `Rp ${fmtRp(total)}`, w);

        if (ticket.paymentStatus === 'DP' && ticket.dpAmount) {
            r.colLine('DP Dibayar', `Rp ${fmtRp(ticket.dpAmount)}`, w);
            r.colLine('Sisa', `Rp ${fmtRp(total - ticket.dpAmount)}`, w);
        }

        if (settings.showInvoiceWarranty && ticket.warrantyDays && ticket.warrantyDays > 0) {
            r.rule(w);
            r.center(`Garansi ${ticket.warrantyDays} hari`, w);
            if (ticket.warrantyExpiry) {
                r.center(`s/d ${fmtDate(ticket.warrantyExpiry)}`, w);
            }
        }

        r.rule(w);
        const footer = settings.invoiceFooter || 'Terima kasih atas kepercayaan Anda!';
        wordWrap(footer, w).forEach(l => r.center(l.trim(), w));
        r.cmd(LF + LF + LF + COMMANDS.CUT);

        return r.build();
    }

    static formatServiceInvoicePlain(
        ticket: ServiceTicket,
        store: StoreProfile,
        settings: ServiceReceiptSettings,
        technicianName?: string,
    ): string {
        const w = PAPER_CHAR_WIDTH[settings.paperWidth] ?? 32;
        const margin = settings.paperWidth === '58mm-on-80mm' ? ' '.repeat(16) : '';
        const lines: string[] = [];
        const add = (t = '') => lines.push(margin + t);
        const rule = () => add('-'.repeat(w));

        add(centerText(store.name.toUpperCase(), w));
        add(centerText('NOTA SERVIS', w));
        if (store.address) wordWrap(store.address, w).forEach(l => add(centerText(l, w)));
        if (store.phone) add(centerText(store.phone, w));
        rule();

        buildTwoCol('Tgl Selesai', fmtDateTime(ticket.dateClosed ?? Date.now()), w).forEach(l => add(l));
        buildTwoCol('No Tiket', `#${ticket.id.slice(-8).toUpperCase()}`, w).forEach(l => add(l));
        rule();

        add(`Pelanggan : ${ticket.customerName}`);
        add(`Perangkat : ${ticket.deviceModel}`);
        if (settings.showInvoiceTechnician && technicianName) add(`Teknisi   : ${technicianName}`);
        rule();

        if (settings.showInvoiceSpareparts && ticket.spareparts?.length > 0) {
            add('SPAREPART:');
            ticket.spareparts.forEach((p: any) => {
                const qty = p.quantity || 1;
                const price = Number(p.price) || 0;
                wordWrap(p.name || 'Item', w).forEach(l => add(l));
                buildTwoCol(`  ${qty}x @Rp${fmtRp(price)}`, `Rp ${fmtRp(qty * price)}`, w).forEach(l => add(l));
            });
        }

        if (settings.showInvoiceServiceFee) {
            buildTwoCol('Jasa Servis', `Rp ${fmtRp(ticket.serviceFee || 0)}`, w).forEach(l => add(l));
        }

        rule();
        const total = (ticket.spareparts?.reduce((s: number, p: any) => s + (Number(p.price) || 0) * (p.quantity || 1), 0) || 0) + (ticket.serviceFee || 0);
        buildTwoCol('TOTAL', `Rp ${fmtRp(total)}`, w).forEach(l => add(l));

        if (ticket.paymentStatus === 'DP' && ticket.dpAmount) {
            buildTwoCol('DP Dibayar', `Rp ${fmtRp(ticket.dpAmount)}`, w).forEach(l => add(l));
            buildTwoCol('Sisa', `Rp ${fmtRp(total - ticket.dpAmount)}`, w).forEach(l => add(l));
        }

        if (settings.showInvoiceWarranty && ticket.warrantyDays && ticket.warrantyDays > 0) {
            rule();
            add(centerText(`Garansi ${ticket.warrantyDays} hari`, w));
            if (ticket.warrantyExpiry) add(centerText(`s/d ${fmtDate(ticket.warrantyExpiry)}`, w));
        }

        rule();
        const footer = settings.invoiceFooter || 'Terima kasih atas kepercayaan Anda!';
        wordWrap(footer, w).forEach(l => add(centerText(l.trim(), w)));

        return lines.join(LF) + LF;
    }

    static formatQueueReceipt(
        transaction: Transaction,
        store: StoreProfile,
        settings: ReceiptSettings,
    ): string {
        const w      = this.width(settings);
        const margin = this.margin(settings);
        const r      = new ReceiptBuilder(margin);

        r.center(store.name, w, true);
        r.center('STRUK ANTRIAN', w);
        r.rule(w);
        r.blank();
        r.center('NOMOR ANTRIAN', w);

        const qNum = transaction.queueNumber ? String(transaction.queueNumber) : '-';
        const centerW = Math.floor(w / 2);
        const paddedQNum = centerText(qNum, centerW);

        r.cmd(COMMANDS.ALIGN_LEFT + COMMANDS.FONT_SIZE_DOUBLE + COMMANDS.BOLD_ON);
        r.raw(margin + paddedQNum + LF);
        r.cmd(COMMANDS.BOLD_OFF + COMMANDS.FONT_SIZE_NORMAL);
        r.blank();

        r.center(fmtDateTime(transaction.date), w);
        r.center(`No: ${transaction.id}`, w);
        if (transaction.customerName) {
            r.center(`Pelanggan: ${transaction.customerName}`, w);
        }
        r.rule(w);

        r.line('RINCIAN PESANAN:', COMMANDS.BOLD_ON, COMMANDS.BOLD_OFF);
        transaction.items.forEach((item: any) => {
            wordWrap(`${item.quantity}x ${item.name}`, w).forEach(l => r.line(l));
            if ((item as any).notes) {
                wordWrap(`  * ${(item as any).notes}`, w).forEach(l => r.line(l));
            }
        });
        r.rule(w);
        r.center('Harap segera disiapkan', w);

        r.cmd(LF + LF + LF + COMMANDS.CUT);

        return r.build();
    }
}
