import { Account } from './account.interface';
import { Bill } from './bill.interface';
import { CreditCard } from './credit-card.interface';
import { Warranty } from './warranty.interface';
import { Login } from '../../../interfaces/login.interface';
import { OwnerType } from './owner-type.interface';

export interface AccountExtended {
    account: Account;
    login: Login
    owner: OwnerType
    bill: Bill;
    creditCard?: CreditCard;
    warranty?: Warranty;
}
