/// <reference types="web-bluetooth" />

import { Transaction, StoreProfile, ReceiptSettings, ServiceReceiptSettings, ServiceTicket } from './types';
import { ReceiptFormatter } from './ReceiptFormatter';

export class PrinterService {
    private static device: BluetoothDevice | null = null;
    private static server: BluetoothRemoteGATTServer | null = null;
    private static printCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

    private static readonly PRINTER_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb', 
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', 
        '0000fee7-0000-1000-8000-00805f9b34fb',
    ];

    static async isBluetoothEnabled(): Promise<boolean> {
        if (typeof navigator === 'undefined' || !navigator.bluetooth) return false;
        try {
            return await navigator.bluetooth.getAvailability();
        } catch (e) {
            return false;
        }
    }

    static async scanAndConnect(): Promise<{ name: string; address: string }> {
        if (typeof navigator === 'undefined' || !navigator.bluetooth) {
            throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: this.PRINTER_SERVICES
            });

            this.device = device;
            
            const server = await device.gatt?.connect();
            if (!server) throw new Error('Failed to connect to GATT server.');
            this.server = server;

            for (const serviceUuid of this.PRINTER_SERVICES) {
                try {
                    const service = await server.getPrimaryService(serviceUuid);
                    const characteristics = await service.getCharacteristics();
                    const writableChar = characteristics.find(c => 
                        c.properties.write || c.properties.writeWithoutResponse
                    );
                    
                    if (writableChar) {
                        this.printCharacteristic = writableChar;
                        break;
                    }
                } catch (e) {
                }
            }

            if (!this.printCharacteristic) {
                throw new Error('No writable printing service found on this device. Ensure it is a thermal printer.');
            }


            device.addEventListener('gattserverdisconnected', () => {
                this.disconnect();
            });

            return {
                name: device.name || 'Bluetooth Printer',
                address: device.id
            };

        } catch (error: any) {
            console.error('Bluetooth connection error:', error);
            // Ignore user cancellation errors
            if (error.name === 'NotFoundError') {
                throw new Error('Pencarian dibatalkan.');
            }
            throw new Error(error.message || 'Gagal terhubung ke printer.');
        }
    }

    static disconnect() {
        if (this.device?.gatt?.connected) {
            try {
                this.device.gatt.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        this.device = null;
        this.server = null;
        this.printCharacteristic = null;
    }

    static isConnected(): boolean {
        return !!this.printCharacteristic && !!this.device?.gatt?.connected;
    }

    static async printReceipt(transaction: Transaction, store: StoreProfile, settings: ReceiptSettings): Promise<void> {
        const formattedReceipt = ReceiptFormatter.formatReceipt(transaction, store, settings);
        await this.printRaw(formattedReceipt);
    }

    static async printQueueReceipt(transaction: Transaction, store: StoreProfile, settings: ReceiptSettings): Promise<void> {
        const formattedQueue = ReceiptFormatter.formatQueueReceipt(transaction, store, settings);
        await this.printRaw(formattedQueue);
    }

    private static strToUint8Array(str: string): Uint8Array {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i) & 0xFF;
        }
        return arr;
    }

    static async printRaw(text: string): Promise<void> {
        if (!this.printCharacteristic || !this.device?.gatt?.connected) {
            throw new Error('Printer tidak terhubung. Silakan hubungkan ulang.');
        }

        const data = this.strToUint8Array(text);
        
        const CHUNK_SIZE = 512;
        try {
            for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                const chunk = data.slice(i, i + CHUNK_SIZE);
                if (this.printCharacteristic.properties.writeWithoutResponse) {
                   await this.printCharacteristic.writeValueWithoutResponse(chunk);
                } else {
                   await this.printCharacteristic.writeValue(chunk);
                }
                
                await new Promise(resolve => setTimeout(resolve, 30));
            }
        } catch (error: any) {
            console.error('Write error:', error);
            throw new Error(`Gagal mengirim data ke printer: ${error.message}`);
        }
    }

    static async printServiceIntakeReceipt(ticket: ServiceTicket, store: StoreProfile, settings: ServiceReceiptSettings, technicianName?: string): Promise<void> {
        const formatted = ReceiptFormatter.formatServiceIntakeReceipt(ticket, store, settings, technicianName);
        await this.printRaw(formatted);
    }

    static async printServiceInvoice(ticket: ServiceTicket, store: StoreProfile, settings: ServiceReceiptSettings, technicianName?: string): Promise<void> {
        const formatted = ReceiptFormatter.formatServiceInvoice(ticket, store, settings, technicianName);
        await this.printRaw(formatted);
    }

    static formatReceiptPlain(transaction: Transaction, store: StoreProfile, settings: ReceiptSettings): string {
        return ReceiptFormatter.formatReceiptPlain(transaction, store, settings);
    }
}
