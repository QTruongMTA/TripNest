from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent))

from build_backend_docs import build_doc


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "6. Backend"


SPEC = {
    "file": "10. Quan ly khach du lich.docx",
    "title": "Quan ly khach du lich",
    "subtitle": "Tai lieu mo ta chuc nang quan ly thong tin khach du lich trong he thong TripNest",
    "purpose": "Mo ta nghiep vu quan ly khach du lich, cac thong tin can luu tru, API lien quan, luong xu ly va yeu cau bao mat du lieu nguoi dung.",
    "sections": [
        ("Muc tieu chuc nang", [
            "Quan ly thong tin ca nhan va ho so su dung dich vu cua khach du lich.",
            "Ho tro admin/nhan su van hanh tra cuu, cap nhat va theo doi trang thai tai khoan khach hang.",
            "Lien ket thong tin khach du lich voi booking, thanh toan, danh gia va thong bao.",
            "Dam bao du lieu nguoi dung duoc bao ve, chi nguoi co quyen moi duoc xem/chinh sua.",
        ]),
        ("Pham vi quan ly", [
            "Thong tin tai khoan: ho ten, email, so dien thoai, vai tro, trang thai hoat dong.",
            "Thong tin ho so: ngay sinh, gioi tinh, dia chi, anh dai dien neu co.",
            "Lich su dat phong/dat tour: ma booking, ngay dat, trang thai, tong tien.",
            "Danh gia va phan hoi: diem danh gia, noi dung, ngay tao, trang thai hien thi.",
            "Thong bao: cac thong bao lien quan den booking, thanh toan va cap nhat he thong.",
        ]),
        ("Vai tro nguoi dung", [
            "Khach du lich: xem va cap nhat thong tin ca nhan cua chinh minh.",
            "Admin: xem danh sach, khoa/mo tai khoan, cap nhat thong tin can thiet va theo doi lich su hoat dong.",
            "Operator/Host: chi xem thong tin khach lien quan den booking thuoc pham vi duoc phan cong.",
        ]),
        ("Luong xu ly chinh", [
            "Nguoi dung dang ky tai khoan hoac duoc tao tu he thong.",
            "Backend validate du lieu, ma hoa mat khau va luu tai khoan vao database.",
            "Khach du lich dang nhap bang email/mat khau va nhan JWT.",
            "Khi dat phong, booking duoc lien ket voi tai khoan khach du lich.",
            "Admin co the loc, tim kiem, xem chi tiet va cap nhat trang thai tai khoan.",
        ]),
        ("Yeu cau bao mat", [
            "Khach du lich chi duoc truy cap thong tin cua chinh minh.",
            "API quan tri khach du lich phai yeu cau JWT va kiem tra role bang RBAC.",
            "Mat khau khong duoc tra ve trong response API.",
            "Thong tin nhay cam nhu email, so dien thoai can duoc su dung dung muc dich.",
            "Can ghi nhan audit log cho cac thao tac quan trong neu he thong co module audit.",
        ]),
    ],
    "tables": [
        {
            "title": "Bang thong tin can quan ly",
            "headers": ["Nhom du lieu", "Truong thong tin", "Mo ta", "Ghi chu"],
            "rows": [
                ["Tai khoan", "id, email, passwordHash, role, status", "Dinh danh va xac thuc nguoi dung", "Khong hien passwordHash"],
                ["Ho so", "name, phone, avatar, address", "Thong tin ca nhan co ban", "Cho phep nguoi dung cap nhat"],
                ["Booking", "bookingId, propertyId, date, status, totalAmount", "Lich su dat phong/dat dich vu", "Lien ket voi User"],
                ["Review", "rating, comment, createdAt", "Danh gia cua khach du lich", "Co the can duyet/hien thi"],
                ["Notification", "title, content, readAt", "Thong bao gui cho khach", "Phuc vu nhac lich/thanh toan"],
            ],
        },
        {
            "title": "API goi y cho quan ly khach du lich",
            "headers": ["Endpoint", "Method", "Muc dich", "Quyen truy cap"],
            "rows": [
                ["/api/users/me", "GET", "Lay thong tin ca nhan cua khach dang dang nhap", "Customer"],
                ["/api/users/me", "PATCH", "Cap nhat ho so ca nhan", "Customer"],
                ["/api/admin/customers", "GET", "Lay danh sach khach du lich", "Admin"],
                ["/api/admin/customers/:id", "GET", "Xem chi tiet mot khach du lich", "Admin"],
                ["/api/admin/customers/:id/status", "PATCH", "Khoa/mo tai khoan khach du lich", "Admin"],
                ["/api/admin/customers/:id/bookings", "GET", "Xem lich su booking cua khach", "Admin"],
            ],
        },
        {
            "title": "Checklist hoan thien chuc nang",
            "headers": ["Hang muc", "Trang thai", "Minh chung/Ghi chu"],
            "rows": [
                ["Co API xem/cap nhat thong tin ca nhan", "Can cap nhat", ""],
                ["Co API admin xem danh sach va chi tiet khach", "Can cap nhat", ""],
                ["Co phan quyen giua customer/admin/operator/host", "Can cap nhat", ""],
                ["Khong tra ve thong tin mat khau trong API", "Can cap nhat", ""],
                ["Co test case cho luong quan ly khach du lich", "Can cap nhat", ""],
            ],
        },
    ],
}


def main():
    OUT_DIR.mkdir(exist_ok=True)
    build_doc(SPEC).save(OUT_DIR / SPEC["file"])


if __name__ == "__main__":
    main()
