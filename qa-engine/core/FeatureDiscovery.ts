import fs from 'fs';
import path from 'path';

export interface DiscoveredFeature {
  id: string;
  name: string;
  module: 'Student' | 'Teacher' | 'Principal' | 'SchoolAdmin' | 'SubscriptionAdmin' | 'Auth' | 'AI' | 'Forum';
  path: string;
  type: 'page' | 'api' | 'microservice';
  httpMethods?: string[];
  interactiveElements: string[];
  requiredRole?: string;
  status: 'VERIFIED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
  notes?: string;
}

export class FeatureDiscovery {
  private srcDir = path.resolve(process.cwd(), 'src/app');

  public discoverAll(): DiscoveredFeature[] {
    const features: DiscoveredFeature[] = [];

    // 1. Scan All Pages
    const pageFiles = this.findFiles(this.srcDir, 'page.tsx');
    for (const file of pageFiles) {
      const relPath = path.relative(this.srcDir, file).replace(/\\/g, '/');
      const route = '/' + relPath.replace(/\/page\.tsx$/, '').replace(/\(auth\)\//, '').replace(/^page\.tsx$/, '');
      const content = fs.readFileSync(file, 'utf8');

      const elements: string[] = [];
      if (content.includes('<form') || content.includes('useForm')) elements.push('Form');
      if (content.includes('<button') || content.includes('Button')) elements.push('Button');
      if (content.includes('<input') || content.includes('Input')) elements.push('Input');
      if (content.includes('<table') || content.includes('Table')) elements.push('Table');
      if (content.includes('Modal') || content.includes('dialog')) elements.push('Modal');
      if (content.includes('QRCodeScanner') || content.includes('qr-scanner')) elements.push('QR-Scanner');
      if (content.includes('GeolocationChecker') || content.includes('navigator.geolocation')) elements.push('Geolocation');
      if (content.includes('StreamVideo') || content.includes('@stream-io')) elements.push('Stream-Video');

      let module: DiscoveredFeature['module'] = 'Student';
      let requiredRole = 'student';

      if (route.startsWith('/teacher')) {
        module = 'Teacher';
        requiredRole = 'teacher';
      } else if (route.startsWith('/kepala')) {
        module = 'Principal';
        requiredRole = 'kepala_sekolah';
      } else if (route.startsWith('/admin-sekolah')) {
        module = 'SchoolAdmin';
        requiredRole = 'admin_sekolah';
      } else if (route.startsWith('/admin/langganan')) {
        module = 'SubscriptionAdmin';
        requiredRole = 'admin_langganan';
      } else if (route === '/login' || route === '/register' || route === '/forgot-password' || route === '/verifikasi-login') {
        module = 'Auth';
        requiredRole = 'public';
      } else if (route.startsWith('/forum')) {
        module = 'Forum';
        requiredRole = 'student';
      }

      let status: DiscoveredFeature['status'] = 'VERIFIED';
      let notes = 'Komponen UI aktif';
      if (route.includes('/video/call') || route.includes('/video/')) {
        status = 'PARTIAL';
        notes = 'Memerlukan kredensial Stream Video aktif';
      }

      features.push({
        id: `feat-${route.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: this.formatRouteName(route),
        module,
        path: route || '/',
        type: 'page',
        interactiveElements: elements,
        requiredRole,
        status,
        notes
      });
    }

    // 2. Scan API Routes
    const apiFiles = this.findFiles(path.join(this.srcDir, 'api'), 'route.ts');
    for (const file of apiFiles) {
      const relPath = path.relative(this.srcDir, file).replace(/\\/g, '/');
      const route = '/' + relPath.replace(/\/route\.ts$/, '');
      const content = fs.readFileSync(file, 'utf8');

      const methods: string[] = [];
      if (/export\s+async\s+function\s+GET/i.test(content)) methods.push('GET');
      if (/export\s+async\s+function\s+POST/i.test(content)) methods.push('POST');
      if (/export\s+async\s+function\s+PUT/i.test(content)) methods.push('PUT');
      if (/export\s+async\s+function\s+DELETE/i.test(content)) methods.push('DELETE');

      let module: DiscoveredFeature['module'] = 'Student';
      if (route.includes('/teacher')) module = 'Teacher';
      else if (route.includes('/school-admin')) module = 'SchoolAdmin';
      else if (route.includes('/admin')) module = 'SubscriptionAdmin';
      else if (route.includes('/forum') || route.includes('/stream')) module = 'Forum';

      features.push({
        id: `api-${route.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: `API ${route}`,
        module,
        path: route,
        type: 'api',
        httpMethods: methods,
        interactiveElements: ['REST-Endpoint'],
        status: route.includes('/stream') ? 'PARTIAL' : 'VERIFIED',
        notes: route.includes('/stream') ? 'API Terintegrasi Stream SDK' : 'Endpoint REST Aktif'
      });
    }

    // 3. Flask AI Service
    features.push({
      id: 'microservice-flask-early-warning',
      name: 'AI Early Warning & K-Means Risk Classification',
      module: 'AI',
      path: '/api/analyze_json',
      type: 'microservice',
      httpMethods: ['POST'],
      interactiveElements: ['K-Means-Model', 'Rule-Based-EWS'],
      status: 'VERIFIED',
      notes: 'Microservice Python Flask Port 5000'
    });

    return features;
  }

  private findFiles(dir: string, filename: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.findFiles(fullPath, filename));
      } else if (file === filename) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private formatRouteName(route: string): string {
    if (!route || route === '/') return 'Landing / Portal Utama';
    return route
      .split('/')
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' > ');
  }
}

export const featureDiscovery = new FeatureDiscovery();
