# B-Bad 2026

Bàn điều hành giải đơn cầu lông: **Tài, Kha, Hiệp, Báu, Minh, Giang, Tiến, Hoàng, Ninh**.

Website tĩnh, không cần tài khoản, không random và không có máy chủ lưu tỉ số. Hoạt động trên trình duyệt máy tính; tối ưu vận hành bằng một MacBook và chế độ trình chiếu.

## Hai phương án để chọn

| Phương án | Link |
| --- | --- |
| Sơ đồ ban đầu, giữ cách nối nhánh trong ảnh | https://taitd1604.github.io/b-bad-2026/ |
| Nhánh cân đối: 1 trận sơ loại → tứ kết → bán kết → chung kết | https://taitd1604.github.io/b-bad-2026/balanced.html |

Thanh chọn phương án nằm trên sơ đồ. Bấm **Mở song song** để mở phương án còn lại trong tab mới; kéo hai cửa sổ cạnh nhau để so sánh. Hai trang có tiến độ, hoàn tác và bản sao lưu riêng. Thử/xóa dữ liệu một phương án không thay đổi phương án còn lại.

Nhánh cân đối xếp hai người vào sơ loại và bảy người vào thẳng tứ kết. Người thắng sơ loại đi vào tứ kết 1. Tổng cộng vẫn tám trận; hai người đánh sơ loại cần bốn trận thắng để vô địch, những người còn lại cần ba.

## Vận hành

1. Quay tên bằng vòng quay bên ngoài.
2. Chọn thẻ tên rồi bấm ô trên sơ đồ, hoặc kéo thả thẻ. Ô **Miễn vòng 1** cũng xếp theo kết quả vòng quay ngoài. Chọn một người đã xếp rồi bấm ô khác để đổi chỗ.
3. Khi đủ chín người, bấm **Bắt đầu thi đấu** để khóa sơ đồ.
4. Bấm **Nhập tỉ số** tại trận đủ hai người. Nhập tỉ số cuối của **một set**; người thắng được đưa sang nhánh tiếp theo sau khi xác nhận.
5. Bấm **Sửa kết quả** khi cần. Nếu người thắng thay đổi, web hỏi xác nhận trước khi xóa các kết quả phụ thuộc. Các trận độc lập giữ nguyên.
6. Dùng nút hoàn tác hoặc **Ctrl / ⌘ Z** nếu thao tác nhầm. **Mở lại xếp nhánh** giữ các tên nhưng xóa kết quả sau xác nhận; có thể hoàn tác.
7. Bấm **Trình chiếu** để ẩn danh sách tên và mở toàn màn hình nếu trình duyệt hỗ trợ. Zoom hoặc **Vừa khung** để điều chỉnh sơ đồ.

Web chỉ yêu cầu điểm nguyên không âm, không hòa; không áp đặt mức thắng 21/31 vì người tổ chức chỉ yêu cầu một set.

Để đưa một người về danh sách chưa xếp: chọn tên đó và bấm **Bỏ khỏi nhánh**. Các vị trí khác vẫn giữ nguyên.

## Chuyển PC → MacBook và sao lưu

- Mở link GitHub Pages trên MacBook để vận hành từ đầu, không cần cài Node.js.
- Nếu đã xếp nhánh/nhập điểm trên PC: menu **⋯ → Xuất bản sao lưu**, chuyển tệp JSON sang MacBook, rồi **⋯ → Nhập bản sao lưu**.
- Nhập bản sao lưu vào đúng trang phương án đã xuất. Web từ chối tệp thuộc phương án còn lại để tránh nhầm sơ đồ.
- Dữ liệu tự lưu trong **trình duyệt trên máy đang dùng**. GitHub Pages/Git không đồng bộ tiến độ giữa máy hoặc trình duyệt.
- Xuất bản sao lưu sau bốc thăm và sau các vòng để giữ bản phục hồi.
- Nếu trình duyệt chặn lưu dữ liệu, web hiển thị cảnh báo và cho xuất bản sao lưu ngay.
- Không dùng chế độ duyệt riêng tư nếu muốn giữ tiến độ sau khi đóng trình duyệt.

## Đường đi của giải

Giữ đúng sơ đồ mẫu. Chín người gồm bốn cặp vòng đầu và một người miễn vòng. Các vị trí do người tổ chức xếp.

| Trận | Người chơi A | Người chơi B |
| --- | --- | --- |
| 1 | Vị trí 1 | Vị trí 2 |
| 2 | Vị trí 3 | Vị trí 4 |
| 3 | Vị trí 5 | Vị trí 6 |
| 4 | Vị trí 7 | Vị trí 8 |
| 5 | Người miễn vòng | Thắng trận 2 |
| 6 | Thắng trận 1 | Thắng trận 3 |
| 7 | Thắng trận 4 | Thắng trận 6 |
| 8 — chung kết | Thắng trận 5 | Thắng trận 7 |

## Phát triển local

Node.js 22 trở lên; không cần cài package cho app và kiểm tra logic.

```sh
npm start
npm test
```

Preview: `http://127.0.0.1:4186/`. Kiểm tra trình duyệt bổ sung nằm trong `tests/browser-check.cjs`, cần Playwright và Microsoft Edge đã có trên máy.

- `core.js`: mô hình giải thuần, kiểm tra tên/tỉ số/nhánh và bản sao lưu.
- `app.js`: giao diện, animation, lưu trên máy, hoàn tác và bản sao lưu.
- `styles.css`, `index.html`, `favicon.svg`: giao diện độc lập, không tải font hoặc thư viện bên ngoài.
- `balanced.html`: trang nhánh cân đối, dùng chung giao diện; sau khi sửa cấu trúc HTML ở `index.html`, chạy `npm run sync-pages` để đồng bộ khung trang.
- `.qa/`: ảnh và dữ liệu kiểm thử local, không đưa lên Git.

## GitHub Pages

Repo riêng: `taitd1604/b-bad-2026`. Publish từ nhánh `main`, thư mục gốc; `.nojekyll` giữ các tệp tĩnh nguyên trạng. Mở `https://taitd1604.github.io/b-bad-2026/` sau khi deployment hoàn tất.

Script `scripts/github-pages.py` dùng tài khoản Git đã đăng nhập qua Git Credential Manager. Credential chỉ nằm trong bộ nhớ; không ghi vào tệp hoặc lệnh Git. Mặc định script chỉ đọc thông tin tài khoản/repo; `--publish` push repo riêng và bật Pages, `--status` đọc trạng thái. Không sao chép dữ liệu vận hành hoặc dự án PES vào repo này.

## Kiểm tra đã thực hiện

23 kiểm tra logic cho cả hai thể thức; 17 luồng trình duyệt từ xếp chín tên đến nhà vô địch, chỉnh kết quả, hoàn tác/tải lại, nhập/xuất và từ chối dữ liệu hỏng/sai phương án, bảo vệ dữ liệu lưu sai phương án, lưu riêng hai trang, kéo thả và bỏ tên khỏi nhánh, trình chiếu, màn hình hẹp, giảm chuyển động và lỗi lưu dữ liệu. Kiểm tra tự động chạy bằng Edge/Chromium trên Windows; Safari chưa được kiểm tra trực tiếp vì môi trường không có WebKit.

Phát hành lên GitHub Pages ngày 12/10/2026. API xác nhận `built`, nguồn `main`/`/`; cả hai trang và sáu tệp vận hành trả HTTP 200, nội dung khớp mã nguồn đã kiểm tra. Kiểm tra trình duyệt trên link thật xác nhận đủ chín tên, xếp tên hoạt động trên cả hai phương án và không có lỗi JavaScript.
