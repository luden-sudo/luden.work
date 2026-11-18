import type { Metadata } from 'next';
import StartDemo from './start-demo';
export const metadata: Metadata = { title: 'Demo', robots: { index: false } };
export default function DemoPage() { return <StartDemo/>; }
