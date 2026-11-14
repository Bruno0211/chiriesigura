import { AlertIcon } from './icons';
import s from './demo.module.css';

/** The portal's own safety box, the kind every classifieds site carries next to rentals. */
export function SafetyTips() {
  return (
    <section className={s.tips} aria-labelledby="tips-title">
      <h2 id="tips-title" className={s.tipsTitle}>
        <AlertIcon />
        Închiriază în siguranță
      </h2>
      <ul className={s.tipsList}>
        <li>
          <strong>Nu trimite avans înainte de vizionare.</strong> Un proprietar real îți arată mai întâi apartamentul.
        </li>
        <li>
          <strong>Vizitează personal locuința.</strong> Fii atent la proprietari „plecați din țară” care trimit pe altcineva.
        </li>
        <li>
          <strong>Cere actele.</strong> Contractul de proprietate și un contract de închiriere înregistrat la ANAF.
        </li>
      </ul>
    </section>
  );
}
