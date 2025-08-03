import { Account } from '../../interfaces/account.interface';
import { Bill } from '../../interfaces/bill.interface';
import { CreditCard } from '../../interfaces/credit-card.interface';
import { Warranty } from '../../interfaces/warranty.interface';
import { Login } from '../../interfaces/login.interface';
import { OwnerType } from '../../interfaces/owner-type.interface';

export interface AccountExtended {
    account: Account;
    login: Login
    owner: OwnerType
    bill: Bill;
    creditCard?: CreditCard;
    warranty?: Warranty;
}
