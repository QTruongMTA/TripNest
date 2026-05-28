# TripNest - He thong dat phong luu tru truc tuyen

> Phien ban: v1.0  
> Nhom: Nhom 4  
> Truong: Hoc vien Ky thuat Quan su  
> Hoc phan: Cong nghe Lap trinh Tich hop  
> Thoi gian: Thang 5/2026

## Gioi thieu

TripNest la he thong dat phong luu tru truc tuyen huong den thi truong Viet Nam. Du an ho tro nguoi dung tim kiem cho o, xem thong tin chi tiet, dat phong va quan ly lich su dat cho. He thong dong thoi cung cap khu vuc quan tri cho Admin va Operator de theo doi nguoi dung, listing, booking, thanh toan, khuyen mai, hoa hong va nhat ky he thong.

Ma nguon hien tai duoc to chuc theo mo hinh monorepo gom ba ung dung chinh:

- `frontend`: ung dung khach hang va chu nha, xay dung bang Next.js.
- `admin-portal`: cong quan tri danh cho Admin va Operator, xay dung bang Next.js.
- `backend`: REST API server, xay dung bang Node.js, Express va Prisma.

## Link Git

Repository: [https://github.com/QTruongMTA/TripNest](https://github.com/QTruongMTA/TripNest)

## Tinh nang hien co

### Nguoi dung va xac thuc

- Dang ky tai khoan bang email va mat khau.
- Dang nhap bang JWT access token.
- Dang xuat va lay thong tin nguoi dung hien tai.
- Cap nhat ho so ca nhan.
- Cap nhat anh dai dien dang base64.
- Doi mat khau.
- Phan quyen theo vai tro: `GUEST`, `HOST`, `ADMIN`, `OPERATOR_PROVINCE`, `OPERATOR_SUB`.

### Tim kiem va hien thi luu tru

- Danh sach co so luu tru.
- Trang chi tiet co so luu tru.
- Loc theo thanh pho, loai co so, khoang gia, so khach va tien nghi.
- Hien thi anh, tien nghi, diem danh gia trung binh va so luong danh gia neu co du lieu.
- Ho tro cac loai luu tru trong schema: `HOUSE`, `APARTMENT`, `VILLA`, `HOMESTAY`, `HOTEL`, `RESORT`, `UNIQUE`.

### Tour

- Danh sach tour.
- Trang chi tiet tour.
- Quan ly lich trinh, hinh anh, diem den, gia, quy mo nhom va lich mo ban trong database.

### Dat phong

- Tao booking cho property.
- Kiem tra ngay bi khoa va booking trung lich truoc khi tao booking.
- Tinh tong tien dua tren gia moi dem va phi don dep.
- Khach hang xem danh sach booking cua minh.
- Host xem booking cua property minh quan ly.
- Host co the xac nhan hoac huy booking dang cho xu ly.
- Admin co the cap nhat trang thai booking.

### Quan ly chu nha

- Host co dashboard rieng.
- Host co trang quan ly property, booking, lich phong va doanh thu.
- Form tao property moi da co nhieu truong chi tiet: dia chi, loai cho o, phong ngu, tien nghi, ngon ngu, chinh sach, gia, anh va thong tin phap ly.

### Quan tri he thong

- Admin dashboard.
- Quan ly nguoi dung.
- Quan ly listing property va tour.
- Quan ly booking.
- Quan ly thanh toan o muc du lieu he thong.
- Quan ly khuyen mai.
- Quan ly quy tac hoa hong.
- Xem review.
- Xem audit log.
- Quan ly tinh/thanh pho.
- Quan ly operator.

### Operator

- Operator dashboard.
- Quan ly listing theo pham vi duoc phan cong.
- Duyet yeu cau tro thanh host.
- Quan ly operator con.
- Quan ly task.
- Quan ly tranh chap.
- Xem bao cao trong portal.

### Du lieu nen tang

- PostgreSQL la database chinh.
- Prisma schema da co cac model cho user, property, tour, booking, payment, review, promotion, commission, notification, audit log, province, operator task va dispute.
- Seed du lieu mau co admin, tinh/thanh pho, tien nghi, khuyen mai, tour va hinh anh tour mau. Seed khong tao property/cho o mau.

## Tinh nang dang phat trien hoac moi o muc placeholder

Mot so noi dung trong thiet ke ban dau chua duoc trien khai day du trong source code hien tai:

- Google Maps API chua duoc tich hop that.
- Dang nhap Google/Facebook OAuth hien moi la placeholder.
- VNPay, MoMo va QR payment chua co flow thanh toan that.
- Email OTP va xac thuc 2 lop chua hoan thien.
- Email service hien moi la placeholder.
- Payment service hien moi la placeholder.
- Review service hien moi tra ve du lieu placeholder cho public review route.
- Chua co tich hop Redis cache.
- Chua co tich hop Cloudinary hoac Multer de upload file len cloud.
- Chua co chuc nang export Excel/PDF.
- Chua co ma hoa AES-256 cho du lieu ca nhan; hien chi co helper hash SHA-256.

## Cong nghe su dung

### Frontend

| Cong nghe | Phien ban | Vai tro |
|---|---:|---|
| Next.js | 14.2.35 | Framework frontend, App Router |
| React | 18.3.1 | Thu vien UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.1 | Styling |
| Axios | 1.x | HTTP client |
| React Hook Form | 7.x | Quan ly form |
| Zustand | 5.x | Quan ly state |

### Admin Portal

| Cong nghe | Phien ban | Vai tro |
|---|---:|---|
| Next.js | 14.2.35 | Framework admin portal |
| React | 18.3.1 | Thu vien UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.1 | Styling |
| Axios | 1.x | HTTP client |
| React Hook Form | 7.x | Quan ly form |
| Zustand | 5.x | Quan ly state |

### Backend

| Cong nghe | Phien ban | Vai tro |
|---|---:|---|
| Node.js | 20 LTS tro len | Runtime |
| Express | 5.2.1 | REST API server |
| TypeScript | 6.0.3 | Type safety |
| Prisma | 7.8.0 | ORM |
| PostgreSQL | 16 khuyen nghi | Database |
| Bcrypt | 6.0.0 | Hash mat khau |
| JSON Web Token | 9.0.3 | Xac thuc |
| Joi | 18.2.1 | Validate request |
| Nodemailer | 8.0.7 | Thu vien gui email, hien service moi la placeholder |
| Helmet | 8.1.0 | Security headers |
| Express Rate Limit | 8.5.2 | Gioi han request |

## Yeu cau he thong

- Node.js 20 LTS tro len.
- npm.
- PostgreSQL.
- Git.

## Cau truc thu muc

```text
TripNest/
|-- admin-portal/
|   `-- src/
|       |-- app/
|       |   |-- admin/
|       |   |-- login/
|       |   `-- operator/
|       |-- components/
|       |-- lib/
|       |-- store/
|       `-- types/
|-- backend/
|   |-- prisma/
|   |   |-- migrations/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   `-- src/
|       |-- controllers/
|       |-- generated/
|       |-- lib/
|       |-- middlewares/
|       |-- routes/
|       |-- services/
|       |-- types/
|       |-- utils/
|       |-- validators/
|       `-- index.ts
|-- docs/
|-- frontend/
|   `-- src/
|       |-- app/
|       |   |-- (auth)/
|       |   |-- (public)/
|       |   |-- host/
|       |   `-- traveler/
|       |-- components/
|       |-- lib/
|       |-- store/
|       `-- types/
|-- package.json
`-- README.md
```

## Cai dat

### 1. Clone repository

```bash
git clone https://github.com/QTruongMTA/TripNest.git
cd TripNest
```

### 2. Cai dat dependencies

Co the cai dat rieng cho tung ung dung:

```bash
npm install
cd backend
npm install
cd ../frontend
npm install
cd ../admin-portal
npm install
```

Hoac cai dat tu tung thu muc khi can phat trien module tuong ung.

### 3. Cau hinh bien moi truong

Tao file `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/tripnest_db"
JWT_SECRET="your-development-secret"
PORT=5000
NODE_ENV=development
```

Tao file `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Tao file `admin-portal/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Khong commit cac file `.env` hoac `.env.local` len Git.

### 4. Khoi tao database

Chay trong thu muc `backend`:

```bash
npx prisma migrate dev
```

Neu can tao Prisma client:

```bash
npx prisma generate
```

### 5. Seed du lieu mau

Chay trong thu muc `backend`:

```bash
npm run seed
```

Tai khoan admin mac dinh sau khi seed:

| Vai tro | Email | Mat khau |
|---|---|---|
| Admin | `admin@tripnest.vn` | `tripnest` |

## Chay du an

Chay backend:

```bash
npm run dev:backend
```

Backend mac dinh chay tai:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

Chay frontend:

```bash
npm run dev:frontend
```

Frontend mac dinh chay tai:

```text
http://localhost:3000
```

Chay admin portal:

```bash
npm run dev:admin
```

Admin Portal mac dinh chay tai:

```text
http://localhost:4000
```

Can chay backend dong thoi voi frontend va admin portal de cac man hinh goi API hoat dong dung.

## Build production

Build backend:

```bash
npm run build:backend
```

Build frontend:

```bash
npm run build:frontend
```

Build admin portal:

```bash
npm run build:admin
```

Chay production rieng tung ung dung:

```bash
cd backend
npm start
```

```bash
cd frontend
npm start
```

```bash
cd admin-portal
npm start
```

## API chinh

Backend su dung prefix:

```text
/api/v1
```

Mot so nhom endpoint dang co:

| Nhom | Endpoint |
|---|---|
| Health check | `GET /health` |
| Auth | `/api/v1/auth` |
| Availability | `/api/v1/availability` |
| Properties | `/api/v1/properties` |
| Tours | `/api/v1/tours` |
| Bookings | `/api/v1/bookings` |
| Host | `/api/v1/host` |
| Notifications | `/api/v1/notifications` |
| Reviews | `/api/v1/reviews` |
| Admin | `/api/v1/admin` |
| Operator | `/api/v1/operator` |
| Provinces | `/api/v1/provinces` |
| Promotions | `/api/v1/promotions` |

## Ghi chu phat trien

- Source hien tai co mot so chuoi tieng Viet bi loi ma hoa trong code backend. Khi sua UI/API message nen chuan hoa lai encoding UTF-8.
- File `.env.example` o root hien chua co noi dung. Nen bo sung mau env theo cac bien moi truong trong README.
- Mot so service da co model/schema nhung chua co logic hoan chinh, vi vay khi trinh bay bao cao nen tach ro giua "da trien khai" va "dinh huong phat trien".

## Tac gia

| Thong tin | Chi tiet |
|---|---|
| Nguoi viet tai lieu | Bui Quy Truong |
| Nhom | Nhom 4 |
| Truong | Hoc vien Ky thuat Quan su |
| Hoc phan | Cong nghe Lap trinh Tich hop |
| Nam hoc | 2025 - 2026 |

## License

Du an duoc phat trien cho muc dich hoc tap va nghien cuu trong hoc phan Cong nghe Lap trinh Tich hop.

```text
MIT License
Chi dung cho muc dich hoc tap, nghien cuu.
Khong su dung cho muc dich thuong mai khi chua co su cho phep.
```
