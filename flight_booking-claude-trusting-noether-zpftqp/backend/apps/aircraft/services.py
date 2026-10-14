from .models import Seat

BUSINESS_COLUMNS = "ABCD"  # 2-2 layout
ECONOMY_COLUMNS = "ABCDEF"  # 3-3 layout


def default_business_seats(total_seats):
    """About 7 % of the cabin, rounded to full 4-seat rows (at least one row)."""
    rows = max(1, round(total_seats * 0.07 / 4))
    return min(rows * 4, (total_seats // 4) * 4)


def generate_seats(aircraft, business_seats=None):
    """(Re)create the seat template: business rows first, economy rows after.

    The seat count always equals ``aircraft.total_seats``; the last economy row
    may be partial.
    """
    total = aircraft.total_seats
    if business_seats is None:
        business_seats = default_business_seats(total)
    business_seats = max(0, min(business_seats, total))

    aircraft.seats.all().delete()
    seats, row, created = [], 1, 0

    def add(columns, seat_class, limit):
        nonlocal row, created
        count = 0
        while count < limit:
            for col in columns:
                if count >= limit:
                    break
                seats.append(
                    Seat(aircraft=aircraft, seat_number=f"{row}{col}", row=row, column=col, seat_class=seat_class)
                )
                count += 1
            row += 1
        created += count

    add(BUSINESS_COLUMNS, Seat.SeatClass.BUSINESS, business_seats)
    add(ECONOMY_COLUMNS, Seat.SeatClass.ECONOMY, total - business_seats)
    Seat.objects.bulk_create(seats)
    return len(seats)
