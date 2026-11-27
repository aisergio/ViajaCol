import { ListPage, listMetadata, type LocaleProps } from '@/components/catalog/pages';

export function generateMetadata(props: LocaleProps) {
  return listMetadata('fiestas', props);
}

export default function Page(props: LocaleProps) {
  return <ListPage category="fiestas" params={props.params} />;
}
